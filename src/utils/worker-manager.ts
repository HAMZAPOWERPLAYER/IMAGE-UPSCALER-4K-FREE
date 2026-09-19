/**
 * Web Worker Pipeline Manager for non-blocking pixel processing.
 * 
 * Transfers image buffers using Transferable ArrayBuffers to avoid copying 30MB+ 4K buffers.
 * Supports instant task cancellation without leaving orphaned threads or memory leaks.
 * Gracefully detects environments where Web Workers are disabled or restricted and provides
 * a seamless main-thread fallback with compatibility notification.
 */

import {
  ResamplingMode,
  WorkerMessage,
  WorkerProcessMessage,
} from '../types';
import { lanczos3Resample, bilinearResample } from './lanczos';
import { applyUnsharpMask } from './sharpen';
import { applyEdgePreservingDenoise, applyClarityBoost } from './enhancement';

// Inline worker script source code string
const WORKER_CODE = `
// Normalized sinc function
function sinc(x) {
  if (x === 0) return 1.0;
  var pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

// Lanczos3 kernel (a = 3)
function lanczos3Kernel(x) {
  var absX = Math.abs(x);
  if (absX < 0.00001) return 1.0;
  if (absX >= 3.0) return 0.0;
  return sinc(absX) * sinc(absX / 3.0);
}

// Precomputes filter weights
function precomputeFilterWeights(srcSize, dstSize) {
  var table = new Array(dstSize);
  var scale = dstSize / srcSize;
  var isUpscaling = scale >= 1.0;
  var radius = isUpscaling ? 3.0 : 3.0 / scale;
  var filterScale = isUpscaling ? 1.0 : scale;

  for (var dstPos = 0; dstPos < dstSize; dstPos++) {
    var srcCenter = (dstPos + 0.5) / scale - 0.5;
    var start = Math.floor(srcCenter - radius) + 1;
    var end = Math.floor(srcCenter + radius);
    var tapCount = end - start + 1;

    var weights = new Float32Array(tapCount);
    var weightSum = 0.0;

    for (var i = 0; i < tapCount; i++) {
      var srcTap = start + i;
      var distance = (srcCenter - srcTap) * filterScale;
      var w = lanczos3Kernel(distance);
      weights[i] = w;
      weightSum += w;
    }

    if (weightSum !== 0.0) {
      var invSum = 1.0 / weightSum;
      for (var j = 0; j < tapCount; j++) {
        weights[j] *= invSum;
      }
    }

    table[dstPos] = {
      startIndex: start,
      weights: weights
    };
  }
  return table;
}

// Edge-preserving bilateral denoiser
function runDenoise(pixels, width, height, strengthPercent) {
  if (strengthPercent <= 0) return pixels;
  var strength = Math.min(Math.max(strengthPercent, 0), 100) / 100.0;
  var threshold = 12.0 + strength * 28.0;
  var invTwoSigmaSq = 1.0 / (2.0 * threshold * threshold);
  var output = new Uint8ClampedArray(pixels.length);

  for (var y = 0; y < height; y++) {
    var yTop = y > 0 ? y - 1 : 0;
    var yBottom = y < height - 1 ? y + 1 : height - 1;
    var rowOffset = y * width * 4;
    var topRowOffset = yTop * width * 4;
    var bottomRowOffset = yBottom * width * 4;

    for (var x = 0; x < width; x++) {
      var xLeft = x > 0 ? x - 1 : 0;
      var xRight = x < width - 1 ? x + 1 : width - 1;

      var curr = rowOffset + x * 4;
      var cR = pixels[curr];
      var cG = pixels[curr + 1];
      var cB = pixels[curr + 2];

      var totalWeight = 1.0;
      var sumR = cR;
      var sumG = cG;
      var sumB = cB;

      var neighbors = [
        topRowOffset + x * 4,
        bottomRowOffset + x * 4,
        rowOffset + xLeft * 4,
        rowOffset + xRight * 4,
      ];

      for (var n = 0; n < 4; n++) {
        var nIdx = neighbors[n];
        var nR = pixels[nIdx];
        var nG = pixels[nIdx + 1];
        var nB = pixels[nIdx + 2];

        var dR = cR - nR;
        var dG = cG - nG;
        var dB = cB - nB;
        var distSq = dR * dR + dG * dG + dB * dB;

        var weight = Math.exp(-distSq * invTwoSigmaSq);
        totalWeight += weight;
        sumR += nR * weight;
        sumG += nG * weight;
        sumB += nB * weight;
      }

      var invTotal = 1.0 / totalWeight;
      output[curr] = (sumR * invTotal + 0.5) | 0;
      output[curr + 1] = (sumG * invTotal + 0.5) | 0;
      output[curr + 2] = (sumB * invTotal + 0.5) | 0;
      output[curr + 3] = pixels[curr + 3];
    }
  }
  return output;
}

// Micro-contrast clarity filter
function runClarity(pixels, width, height) {
  var output = new Uint8ClampedArray(pixels.length);
  var total = width * height * 4;

  for (var i = 0; i < total; i += 4) {
    var r = pixels[i];
    var g = pixels[i + 1];
    var b = pixels[i + 2];

    var luma = 0.299 * r + 0.587 * g + 0.114 * b;
    var normLuma = luma / 255.0;
    var sLuma = (3 * normLuma * normLuma - 2 * normLuma * normLuma * normLuma) * 255.0;
    var delta = (sLuma - luma) * 0.28;

    r += delta;
    g += delta;
    b += delta;

    var newLuma = 0.299 * r + 0.587 * g + 0.114 * b;
    r = newLuma + (r - newLuma) * 1.06;
    g = newLuma + (g - newLuma) * 1.06;
    b = newLuma + (b - newLuma) * 1.06;

    output[i] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;
    output[i + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;
    output[i + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

// Separable Lanczos3 Resampler
function runLanczos(srcData, srcW, srcH, dstW, dstH, reportProgress) {
  var hWeights = precomputeFilterWeights(srcW, dstW);
  var intermediate = new Float32Array(dstW * srcH * 4);
  var reportStep = Math.max(1, Math.floor(srcH / 20));

  for (var y = 0; y < srcH; y++) {
    var srcRowOffset = y * srcW * 4;
    var interRowOffset = y * dstW * 4;

    for (var x = 0; x < dstW; x++) {
      var entry = hWeights[x];
      var sIdx = entry.startIndex;
      var weights = entry.weights;
      var tapCount = weights.length;

      var r = 0.0, g = 0.0, b = 0.0, a = 0.0;

      for (var t = 0; t < tapCount; t++) {
        var srcX = Math.min(Math.max(sIdx + t, 0), srcW - 1);
        var pOff = srcRowOffset + srcX * 4;
        var w = weights[t];

        r += srcData[pOff] * w;
        g += srcData[pOff + 1] * w;
        b += srcData[pOff + 2] * w;
        a += srcData[pOff + 3] * w;
      }

      var dOff = interRowOffset + x * 4;
      intermediate[dOff] = r;
      intermediate[dOff + 1] = g;
      intermediate[dOff + 2] = b;
      intermediate[dOff + 3] = a;
    }

    if (y % reportStep === 0) {
      reportProgress((y / srcH) * 45, 'Lanczos horizontal pass...');
    }
  }

  var vWeights = precomputeFilterWeights(srcH, dstH);
  var output = new Uint8ClampedArray(dstW * dstH * 4);
  var vReportStep = Math.max(1, Math.floor(dstH / 20));

  for (var vy = 0; vy < dstH; vy++) {
    var ventry = vWeights[vy];
    var vsIdx = ventry.startIndex;
    var vweights = ventry.weights;
    var vtapCount = vweights.length;
    var outRowOffset = vy * dstW * 4;

    for (var vx = 0; vx < dstW; vx++) {
      var vr = 0.0, vg = 0.0, vb = 0.0, va = 0.0;

      for (var vt = 0; vt < vtapCount; vt++) {
        var srcY = Math.min(Math.max(vsIdx + vt, 0), srcH - 1);
        var inOff = srcY * dstW * 4 + vx * 4;
        var vw = vweights[vt];

        vr += intermediate[inOff] * vw;
        vg += intermediate[inOff + 1] * vw;
        vb += intermediate[inOff + 2] * vw;
        va += intermediate[inOff + 3] * vw;
      }

      var oOff = outRowOffset + vx * 4;
      output[oOff] = vr < 0 ? 0 : vr > 255 ? 255 : (vr + 0.5) | 0;
      output[oOff + 1] = vg < 0 ? 0 : vg > 255 ? 255 : (vg + 0.5) | 0;
      output[oOff + 2] = vb < 0 ? 0 : vb > 255 ? 255 : (vb + 0.5) | 0;
      output[oOff + 3] = va < 0 ? 0 : va > 255 ? 255 : (va + 0.5) | 0;
    }

    if (vy % vReportStep === 0) {
      reportProgress(45 + (vy / dstH) * 45, 'Lanczos vertical pass...');
    }
  }

  return output;
}

// Fast Bilinear Resampler
function runBilinear(srcData, srcW, srcH, dstW, dstH, reportProgress) {
  var output = new Uint8ClampedArray(dstW * dstH * 4);
  var xRatio = srcW / dstW;
  var yRatio = srcH / dstH;
  var reportStep = Math.max(1, Math.floor(dstH / 20));

  for (var y = 0; y < dstH; y++) {
    var srcY = (y + 0.5) * yRatio - 0.5;
    var y0 = Math.max(0, Math.floor(srcY));
    var y1 = Math.min(srcH - 1, y0 + 1);
    var yDiff = Math.max(0, srcY - y0);

    var outRowOffset = y * dstW * 4;
    var row0Offset = y0 * srcW * 4;
    var row1Offset = y1 * srcW * 4;

    for (var x = 0; x < dstW; x++) {
      var srcX = (x + 0.5) * xRatio - 0.5;
      var x0 = Math.max(0, Math.floor(srcX));
      var x1 = Math.min(srcW - 1, x0 + 1);
      var xDiff = Math.max(0, srcX - x0);

      var w00 = (1 - xDiff) * (1 - yDiff);
      var w10 = xDiff * (1 - yDiff);
      var w01 = (1 - xDiff) * yDiff;
      var w11 = xDiff * yDiff;

      var p00 = row0Offset + x0 * 4;
      var p10 = row0Offset + x1 * 4;
      var p01 = row1Offset + x0 * 4;
      var p11 = row1Offset + x1 * 4;

      var outOffset = outRowOffset + x * 4;
      for (var c = 0; c < 4; c++) {
        var val =
          srcData[p00 + c] * w00 +
          srcData[p10 + c] * w10 +
          srcData[p01 + c] * w01 +
          srcData[p11 + c] * w11;
        output[outOffset + c] = (val + 0.5) | 0;
      }
    }

    if (y % reportStep === 0) {
      reportProgress((y / dstH) * 90, 'Fast bilinear scaling...');
    }
  }

  return output;
}

// Unsharp Mask Sharpening
function runSharpen(pixels, width, height, strengthPercent) {
  if (strengthPercent <= 0) return pixels;
  var k = (strengthPercent / 100.0) * 0.35;
  var centerWeight = 1.0 + 4.0 * k;
  var output = new Uint8ClampedArray(pixels.length);

  for (var y = 0; y < height; y++) {
    var yTop = y > 0 ? y - 1 : 0;
    var yBottom = y < height - 1 ? y + 1 : height - 1;
    var rowOffset = y * width * 4;
    var topRowOffset = yTop * width * 4;
    var bottomRowOffset = yBottom * width * 4;

    for (var x = 0; x < width; x++) {
      var xLeft = x > 0 ? x - 1 : 0;
      var xRight = x < width - 1 ? x + 1 : width - 1;

      var curr = rowOffset + x * 4;
      var top = topRowOffset + x * 4;
      var bottom = bottomRowOffset + x * 4;
      var left = rowOffset + xLeft * 4;
      var right = rowOffset + xRight * 4;

      var r = pixels[curr] * centerWeight - k * (pixels[top] + pixels[bottom] + pixels[left] + pixels[right]);
      output[curr] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;

      var g = pixels[curr + 1] * centerWeight - k * (pixels[top + 1] + pixels[bottom + 1] + pixels[left + 1] + pixels[right + 1]);
      output[curr + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;

      var b = pixels[curr + 2] * centerWeight - k * (pixels[top + 2] + pixels[bottom + 2] + pixels[left + 2] + pixels[right + 2]);
      output[curr + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;

      output[curr + 3] = pixels[curr + 3];
    }
  }
  return output;
}

self.onmessage = function(e) {
  var msg = e.data;
  if (!msg || msg.action !== 'process') return;

  var startTime = Date.now();
  var id = msg.id;

  try {
    var srcData = new Uint8ClampedArray(msg.imageBuffer);
    var srcW = msg.sourceWidth;
    var srcH = msg.sourceHeight;
    var dstW = msg.targetWidth;
    var dstH = msg.targetHeight;

    function reportProgress(percent, stage) {
      self.postMessage({
        action: 'progress',
        id: id,
        percent: Math.round(percent),
        stage: stage
      });
    }

    reportProgress(2, 'Initializing pipeline...');

    // Pre-resampling edge-preserving denoise to eliminate JPEG blockiness
    if (msg.denoiseStrength && msg.denoiseStrength > 0) {
      reportProgress(10, 'Smoothing JPEG artifacts & noise...');
      srcData = runDenoise(srcData, srcW, srcH, msg.denoiseStrength);
    }

    var scaled;
    if (msg.resamplingMode === 'lanczos') {
      scaled = runLanczos(srcData, srcW, srcH, dstW, dstH, reportProgress);
    } else {
      scaled = runBilinear(srcData, srcW, srcH, dstW, dstH, reportProgress);
    }

    if (msg.sharpenEnabled && msg.sharpenStrength > 0) {
      reportProgress(92, 'Applying unsharp mask sharpening...');
      scaled = runSharpen(scaled, dstW, dstH, msg.sharpenStrength);
    }

    if (msg.clarityBoost) {
      reportProgress(96, 'Refining micro-contrast clarity...');
      scaled = runClarity(scaled, dstW, dstH);
    }

    reportProgress(98, 'Finalizing pixel buffer...');

    var duration = Date.now() - startTime;
    self.postMessage(
      {
        action: 'complete',
        id: id,
        outputBuffer: scaled.buffer,
        width: dstW,
        height: dstH,
        durationMs: duration
      },
      [scaled.buffer] // Transferable ArrayBuffer zero-copy
    );
  } catch (err) {
    self.postMessage({
      action: 'error',
      id: id,
      error: err && err.message ? err.message : String(err)
    });
  }
};
`;

export interface ProcessingRequest {
  id: string;
  imageBuffer: ArrayBuffer;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  resamplingMode: ResamplingMode;
  sharpenEnabled: boolean;
  sharpenStrength: number;
  denoiseStrength?: number;
  clarityBoost?: boolean;
  onProgress: (percent: number, stage: string) => void;
  onComplete: (buffer: ArrayBufferLike, width: number, height: number, durationMs: number) => void;
  onError: (error: string) => void;
}

class PipelineWorkerManager {
  private activeWorker: Worker | null = null;
  private currentTaskId: string | null = null;
  private workerBlobUrl: string | null = null;
  private compatibilityMode = false;
  private onCompatibilityCallback: (() => void) | null = null;

  constructor() {
    this.initWorkerUrl();
  }

  public setCompatibilityCallback(cb: () => void) {
    this.onCompatibilityCallback = cb;
    if (this.compatibilityMode) {
      cb();
    }
  }

  private initWorkerUrl() {
    try {
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      this.workerBlobUrl = URL.createObjectURL(blob);
    } catch {
      this.compatibilityMode = true;
    }
  }

  public processImage(req: ProcessingRequest): () => void {
    this.cancelCurrent();
    this.currentTaskId = req.id;

    // Check if workers are available
    if (typeof Worker === 'undefined' || !this.workerBlobUrl || this.compatibilityMode) {
      this.triggerCompatibility();
      return this.runMainThreadFallback(req);
    }

    try {
      const worker = new Worker(this.workerBlobUrl);
      this.activeWorker = worker;

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const data = e.data;
        if (!data || data.id !== req.id) return;

        if (data.action === 'progress') {
          req.onProgress(data.percent, data.stage);
        } else if (data.action === 'complete') {
          this.cleanupWorker();
          req.onComplete(data.outputBuffer, data.width, data.height, data.durationMs);
        } else if (data.action === 'error') {
          this.cleanupWorker();
          req.onError(data.error);
        }
      };

      worker.onerror = () => {
        this.cleanupWorker();
        // Fallback to main thread execution
        this.triggerCompatibility();
        this.runMainThreadFallback(req);
      };

      const msg: WorkerProcessMessage = {
        action: 'process',
        id: req.id,
        imageBuffer: req.imageBuffer,
        sourceWidth: req.sourceWidth,
        sourceHeight: req.sourceHeight,
        targetWidth: req.targetWidth,
        targetHeight: req.targetHeight,
        resamplingMode: req.resamplingMode,
        sharpenEnabled: req.sharpenEnabled,
        sharpenStrength: req.sharpenStrength,
        denoiseStrength: req.denoiseStrength || 0,
        clarityBoost: req.clarityBoost ?? true,
      };

      // Transfer image buffer zero-copy
      worker.postMessage(msg, [req.imageBuffer]);
    } catch {
      this.triggerCompatibility();
      return this.runMainThreadFallback(req);
    }

    // Return cancellation trigger
    return () => {
      if (this.currentTaskId === req.id) {
        this.cancelCurrent();
      }
    };
  }

  private triggerCompatibility() {
    if (!this.compatibilityMode) {
      this.compatibilityMode = true;
      if (this.onCompatibilityCallback) {
        this.onCompatibilityCallback();
      }
    }
  }

  private runMainThreadFallback(req: ProcessingRequest): () => void {
    let cancelled = false;
    const start = Date.now();

    // Use requestAnimationFrame / setTimeout to prevent absolute freeze
    setTimeout(() => {
      if (cancelled) return;
      try {
        req.onProgress(5, 'Running on main thread (compatibility mode)...');
        let srcData: Uint8ClampedArray = new Uint8ClampedArray(req.imageBuffer as ArrayBuffer);

        if (req.denoiseStrength && req.denoiseStrength > 0) {
          req.onProgress(10, 'Smoothing JPEG artifacts & noise...');
          srcData = applyEdgePreservingDenoise(
            srcData,
            req.sourceWidth,
            req.sourceHeight,
            req.denoiseStrength
          );
        }

        let outputData: Uint8ClampedArray;
        if (req.resamplingMode === 'lanczos') {
          outputData = lanczos3Resample(
            srcData,
            req.sourceWidth,
            req.sourceHeight,
            req.targetWidth,
            req.targetHeight,
            (p, s) => {
              if (!cancelled) req.onProgress(Math.round(p * 80), s);
            }
          );
        } else {
          outputData = bilinearResample(
            srcData,
            req.sourceWidth,
            req.sourceHeight,
            req.targetWidth,
            req.targetHeight,
            (p, s) => {
              if (!cancelled) req.onProgress(Math.round(p * 80), s);
            }
          );
        }

        if (cancelled) return;

        if (req.sharpenEnabled && req.sharpenStrength > 0) {
          req.onProgress(90, 'Applying unsharp mask sharpening...');
          outputData = applyUnsharpMask(
            outputData,
            req.targetWidth,
            req.targetHeight,
            req.sharpenStrength
          );
        }

        if (cancelled) return;

        if (req.clarityBoost) {
          req.onProgress(95, 'Refining micro-contrast clarity...');
          outputData = applyClarityBoost(
            outputData,
            req.targetWidth,
            req.targetHeight
          );
        }

        if (cancelled) return;

        const duration = Date.now() - start;
        req.onComplete(outputData.buffer, req.targetWidth, req.targetHeight, duration);
      } catch (err) {
        if (!cancelled) {
          req.onError(err instanceof Error ? err.message : String(err));
        }
      }
    }, 10);

    return () => {
      cancelled = true;
    };
  }

  public cancelCurrent(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
    this.currentTaskId = null;
  }

  private cleanupWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
    this.currentTaskId = null;
  }
}

export const workerManager = new PipelineWorkerManager();
