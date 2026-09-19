/**
 * Lanczos3 Resampling Algorithm (Pure JavaScript)
 * 
 * MATHEMATICAL FOUNDATION:
 * The Lanczos filter is an optimal windowed sinc reconstruction filter based on the normalized sinc function:
 *   sinc(x) = sin(π * x) / (π * x)  for x ≠ 0, and sinc(0) = 1
 * 
 * With a window size parameter a = 3 (Lanczos3), the kernel is defined as:
 *   L(x) = sinc(x) * sinc(x / 3)   for |x| < 3
 *   L(x) = 0                       for |x| ≥ 3
 * 
 * WHY SEPARABLE PASSES?
 * A 2D filter evaluated directly requires (2 * 3)^2 = 36 sample lookups per output pixel.
 * Because the sinc kernel is mathematically separable:
 *   L2D(x, y) = L(x) * L(y)
 * We decompose the 2D resampling into two consecutive 1D passes:
 *   1. Horizontal Pass: scales from (srcW, srcH) to (dstW, srcH) (6 samples per pixel)
 *   2. Vertical Pass: scales from (dstW, srcH) to (dstW, dstH) (6 samples per pixel)
 * Total lookups drop from 36 to 12 per pixel (a 300% performance gain).
 * 
 * PRECOMPUTATION:
 * For every column in the output, the source pixel sampling points and weights are invariant
 * across all rows. By precomputing a table of tap indices and normalized weights before looping,
 * the inner convolution executes at maximum speed with zero redundant trigonometry.
 * 
 * EDGE HANDLING:
 * Samples extending outside image borders are clamped to the edge pixel index [0, dimension - 1].
 * This avoids dark or white border-fringing artifacts.
 * 
 * SENSIBLE MEGAPIXEL THRESHOLD FOR FALLBACK:
 * Upscaling to standard 4K UHD (3840 × 2160 = 8.29 MP) with Lanczos3 takes ~1.5 - 3.5s in a Web Worker.
 * For target resolutions beyond 16 Megapixels (e.g. 5000×3500+), CPU memory bandwidth and loop count
 * make pure CPU Lanczos exceed 10 seconds. The stepped bilinear canvas approach is preserved as a fallback
 * or for users selecting "Fast (bilinear)".
 */

export const LANCZOS_MAX_RECOMMENDED_MEGAPIXELS = 16.0;

interface FilterWeights {
  startIndex: number;
  weights: Float32Array;
}

/**
 * Normalized Sinc function
 */
function sinc(x: number): number {
  if (x === 0) return 1.0;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

/**
 * Lanczos3 windowed sinc kernel (a = 3)
 */
function lanczos3Kernel(x: number): number {
  const absX = Math.abs(x);
  if (absX < 0.00001) return 1.0;
  if (absX >= 3.0) return 0.0;
  return sinc(absX) * sinc(absX / 3.0);
}

/**
 * Precomputes 1D sampling weights and source tap indices for each output position.
 */
function precomputeFilterWeights(srcSize: number, dstSize: number): FilterWeights[] {
  const table: FilterWeights[] = new Array(dstSize);
  const scale = dstSize / srcSize;
  const isUpscaling = scale >= 1.0;

  // Filter radius: for upscaling, a = 3 source pixels. For downscaling, scale filter to prevent aliasing
  const radius = isUpscaling ? 3.0 : 3.0 / scale;
  const filterScale = isUpscaling ? 1.0 : scale;

  for (let dstPos = 0; dstPos < dstSize; dstPos++) {
    // Map output pixel center to source continuous coordinate
    const srcCenter = (dstPos + 0.5) / scale - 0.5;

    const start = Math.floor(srcCenter - radius) + 1;
    const end = Math.floor(srcCenter + radius);
    const tapCount = end - start + 1;

    const weights = new Float32Array(tapCount);
    let weightSum = 0.0;

    for (let i = 0; i < tapCount; i++) {
      const srcTap = start + i;
      const distance = (srcCenter - srcTap) * filterScale;
      const w = lanczos3Kernel(distance);
      weights[i] = w;
      weightSum += w;
    }

    // Normalize weights to sum to 1.0 to preserve overall luminance
    if (weightSum !== 0.0) {
      const invSum = 1.0 / weightSum;
      for (let i = 0; i < tapCount; i++) {
        weights[i] *= invSum;
      }
    }

    table[dstPos] = {
      startIndex: start,
      weights,
    };
  }

  return table;
}

/**
 * Executes a full 2-pass Lanczos3 resampling on raw RGBA pixel buffers.
 * Accepts an optional onProgress callback (0.0 to 1.0).
 */
export function lanczos3Resample(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  onProgress?: (progress: number, stage: string) => void
): Uint8ClampedArray {
  // Precompute horizontal weights table
  const hWeights = precomputeFilterWeights(srcW, dstW);

  // Pass 1: Horizontal resampling -> intermediate buffer of size (dstW, srcH)
  // Store intermediate as Float32Array to preserve sub-pixel color precision across passes
  const intermediate = new Float32Array(dstW * srcH * 4);

  const reportInterval = Math.max(1, Math.floor(srcH / 20));

  for (let y = 0; y < srcH; y++) {
    const srcRowOffset = y * srcW * 4;
    const interRowOffset = y * dstW * 4;

    for (let x = 0; x < dstW; x++) {
      const { startIndex, weights } = hWeights[x];
      const tapCount = weights.length;

      let r = 0.0;
      let g = 0.0;
      let b = 0.0;
      let a = 0.0;

      for (let t = 0; t < tapCount; t++) {
        // Clamp tap position to edge pixel
        const srcX = Math.min(Math.max(startIndex + t, 0), srcW - 1);
        const pixelOffset = srcRowOffset + srcX * 4;
        const w = weights[t];

        r += srcData[pixelOffset] * w;
        g += srcData[pixelOffset + 1] * w;
        b += srcData[pixelOffset + 2] * w;
        a += srcData[pixelOffset + 3] * w;
      }

      const dstPixelOffset = interRowOffset + x * 4;
      intermediate[dstPixelOffset] = r;
      intermediate[dstPixelOffset + 1] = g;
      intermediate[dstPixelOffset + 2] = b;
      intermediate[dstPixelOffset + 3] = a;
    }

    if (onProgress && y % reportInterval === 0) {
      onProgress((y / srcH) * 0.45, 'Lanczos horizontal pass...');
    }
  }

  // Precompute vertical weights table
  const vWeights = precomputeFilterWeights(srcH, dstH);

  // Pass 2: Vertical resampling from intermediate (dstW, srcH) to final output (dstW, dstH)
  const output = new Uint8ClampedArray(dstW * dstH * 4);
  const vReportInterval = Math.max(1, Math.floor(dstH / 20));

  for (let y = 0; y < dstH; y++) {
    const { startIndex, weights } = vWeights[y];
    const tapCount = weights.length;
    const outRowOffset = y * dstW * 4;

    for (let x = 0; x < dstW; x++) {
      let r = 0.0;
      let g = 0.0;
      let b = 0.0;
      let a = 0.0;

      for (let t = 0; t < tapCount; t++) {
        // Clamp tap position to vertical edge
        const srcY = Math.min(Math.max(startIndex + t, 0), srcH - 1);
        const interPixelOffset = srcY * dstW * 4 + x * 4;
        const w = weights[t];

        r += intermediate[interPixelOffset] * w;
        g += intermediate[interPixelOffset + 1] * w;
        b += intermediate[interPixelOffset + 2] * w;
        a += intermediate[interPixelOffset + 3] * w;
      }

      const outPixelOffset = outRowOffset + x * 4;
      // Clamp values to [0, 255]
      output[outPixelOffset] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;
      output[outPixelOffset + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;
      output[outPixelOffset + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;
      output[outPixelOffset + 3] = a < 0 ? 0 : a > 255 ? 255 : (a + 0.5) | 0;
    }

    if (onProgress && y % vReportInterval === 0) {
      onProgress(0.45 + (y / dstH) * 0.45, 'Lanczos vertical pass...');
    }
  }

  if (onProgress) {
    onProgress(0.90, 'Resampling complete');
  }

  return output;
}

/**
 * Fast Bilinear Resampling (pure buffer implementation)
 * Used when user selects "Fast (bilinear)" or as instant fallback.
 */
export function bilinearResample(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  onProgress?: (progress: number, stage: string) => void
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  const reportInterval = Math.max(1, Math.floor(dstH / 20));

  for (let y = 0; y < dstH; y++) {
    const srcY = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.floor(srcY));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const yDiff = Math.max(0, srcY - y0);

    const outRowOffset = y * dstW * 4;
    const row0Offset = y0 * srcW * 4;
    const row1Offset = y1 * srcW * 4;

    for (let x = 0; x < dstW; x++) {
      const srcX = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.floor(srcX));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const xDiff = Math.max(0, srcX - x0);

      const w00 = (1 - xDiff) * (1 - yDiff);
      const w10 = xDiff * (1 - yDiff);
      const w01 = (1 - xDiff) * yDiff;
      const w11 = xDiff * yDiff;

      const p00 = row0Offset + x0 * 4;
      const p10 = row0Offset + x1 * 4;
      const p01 = row1Offset + x0 * 4;
      const p11 = row1Offset + x1 * 4;

      const outOffset = outRowOffset + x * 4;
      for (let c = 0; c < 4; c++) {
        const val =
          srcData[p00 + c] * w00 +
          srcData[p10 + c] * w10 +
          srcData[p01 + c] * w01 +
          srcData[p11 + c] * w11;
        output[outOffset + c] = (val + 0.5) | 0;
      }
    }

    if (onProgress && y % reportInterval === 0) {
      onProgress((y / dstH) * 0.90, 'Fast bilinear scaling...');
    }
  }

  return output;
}
