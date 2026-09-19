/**
 * Core types for Upscale - 100% client-side image upscaling application.
 */

export type ResamplingMode = 'lanczos' | 'bilinear';
export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';
export type QueueStatus = 'queued' | 'processing' | 'done' | 'error';
export type ScalingMode = 'multiplier' | 'dimensions';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessingSettings {
  scalingMode: ScalingMode;
  scaleMultiplier: number; // e.g. 2, 3, 4, or custom (1.2 to 4.0)
  targetWidth: number;
  targetHeight: number;
  lockAspectRatio: boolean;
  resamplingMode: ResamplingMode;
  sharpenEnabled: boolean;
  sharpenStrength: number; // 0 to 100%
  denoiseStrength: number; // 0 to 100% (JPEG deblock / artifact smoothing)
  clarityBoost: boolean; // Subtle local contrast & saturation refinement
  exportFormat: ExportFormat;
  exportQuality: number; // 0.1 to 1.0 (for JPEG and WebP)
}

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  originalSize: number; // in bytes
  originalDimensions: ImageDimensions;
  targetDimensions?: ImageDimensions;
  thumbnailUrl: string;
  status: QueueStatus;
  progressPercent: number; // 0 to 100
  progressStage: string;
  errorMessage?: string;
  outputBlob?: Blob;
  outputUrl?: string;
  outputDimensions?: ImageDimensions;
  outputSize?: number;
  processingTimeMs?: number;
  processingDurationMs?: number;
  settings?: ProcessingSettings;
  customSettings?: Partial<ProcessingSettings>; // Per-item override
  exifOrientation: number; // 1-8
}

export interface Preset {
  id: string;
  name: string;
  isBuiltIn: boolean;
  settings: ProcessingSettings;
}

export interface WorkerProcessMessage {
  action: 'process';
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
}

export interface WorkerProgressMessage {
  action: 'progress';
  id: string;
  percent: number;
  stage: string;
}

export interface WorkerCompleteMessage {
  action: 'complete';
  id: string;
  outputBuffer: ArrayBuffer;
  width: number;
  height: number;
  durationMs: number;
}

export interface WorkerErrorMessage {
  action: 'error';
  id: string;
  error: string;
}

export type WorkerMessage =
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage;
