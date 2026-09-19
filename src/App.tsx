/**
 * Upscale — 100% Client-Side Image Resampling & Sharpening
 * 
 * FEATURES IMPLEMENTED:
 * 1. Multi-file batch upload via Drag & Drop or file picker with thumbnail, dimensions, and size preview.
 * 2. Dedicated Web Worker pipeline with Transferable ArrayBuffers for non-blocking 60fps UI.
 * 3. Pure JavaScript Separable Lanczos3 (windowed sinc, a=3) resampling operating directly on raw pixel buffers.
 * 4. 3x3 Unsharp Mask sharpening convolution with adjustable intensity slider.
 * 5. Minimal zero-dependency EXIF Orientation parser and auto-normalizer (strips privacy/GPS metadata on export).
 * 6. LocalStorage preset manager with built-in presets ("Wallpaper 4K", "Social thumbnail", "Print-ready 1080p") and private browsing quota protection.
 * 7. Pure JavaScript zero-dependency PKZIP Store-method archiver for one-click batch ZIP downloads.
 * 8. Interactive before/after split comparison viewer with keyboard arrow navigation and zoom tools.
 * 9. WCAG 2.1 AA accessibility compliance: keyboard-operable sliders, ARIA live region status announcer, visible focus rings, and prefers-reduced-motion support.
 * 
 * KNOWN LIMITATIONS:
 * This application performs mathematical interpolation and frequency sharpening. It does not utilize
 * artificial neural super-resolution models (which require multi-megabyte weights and hallucinate imaginary detail).
 * 
 * BROWSER SUPPORT:
 * Supported on all modern evergreen browsers (Chrome 80+, Firefox 75+, Safari 14+, Edge 80+, iOS Safari, Chrome Android).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueueItem, ProcessingSettings, Preset } from './types';
import { normalizeImage } from './utils/exif';
import { workerManager } from './utils/worker-manager';
import {
  loadPresets,
  saveUserPresets,
  DEFAULT_SETTINGS,
} from './utils/presets';
import { createZipArchive, triggerFileDownload } from './utils/zip';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { ControlPanel } from './components/ControlPanel';
import { QueueList } from './components/QueueList';
import { ComparisonViewer } from './components/ComparisonViewer';
import { PresetsModal } from './components/PresetsModal';
import { InfoModal } from './components/InfoModal';
import { CompatibilityNotice } from './components/CompatibilityNotice';

export default function App() {
  // Theme state: dark by default, respects system setting
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  // Settings & Presets
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_SETTINGS);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isStorageWritable, setIsStorageWritable] = useState(true);

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeProcessingId, setActiveProcessingId] = useState<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const cancelCurrentTaskRef = useRef<(() => void) | null>(null);

  // Modals & Viewer
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [comparingItem, setComparingItem] = useState<QueueItem | null>(null);
  const [showCompatibilityNotice, setShowCompatibilityNotice] = useState(false);

  // Accessibility screen reader announcer
  const [ariaLiveMessage, setAriaLiveMessage] = useState<string>('Upscale application ready.');

  // Initialize presets from storage
  useEffect(() => {
    const { presets: loadedPresets, isStorageWritable: writable } = loadPresets();
    setPresets(loadedPresets);
    setIsStorageWritable(writable);
  }, []);

  // Update theme class on root
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  // Hook up worker compatibility listener
  useEffect(() => {
    workerManager.setCompatibilityCallback(() => {
      setShowCompatibilityNotice(true);
      setAriaLiveMessage('Running in compatibility mode — processing may briefly pause interface.');
    });
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Safe object URL cleanup
  const cleanupQueueItemUrls = (item: QueueItem) => {
    if (item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.thumbnailUrl);
    }
    if (item.outputUrl && item.outputUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.outputUrl);
    }
  };

  // Clear all items with memory cleanup
  const handleClearAll = () => {
    if (isProcessingRef.current) {
      if (cancelCurrentTaskRef.current) {
        cancelCurrentTaskRef.current();
      }
      workerManager.cancelCurrent();
      isProcessingRef.current = false;
      setActiveProcessingId(null);
    }
    queue.forEach(cleanupQueueItemUrls);
    setQueue([]);
    setAriaLiveMessage('Image queue cleared.');
  };

  // File addition handler
  const handleFilesSelected = async (files: FileList | File[]) => {
    const newItems: QueueItem[] = [];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // File validation
      const nameLower = file.name.toLowerCase();
      const isValidExt = validExtensions.some((ext) => nameLower.endsWith(ext));
      const isValidMime = file.type.startsWith('image/');

      if (!isValidExt && !isValidMime) {
        continue;
      }

      if (file.size === 0) {
        newItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          originalSize: 0,
          originalDimensions: { width: 0, height: 0 },
          thumbnailUrl: '',
          status: 'error',
          progressPercent: 0,
          progressStage: '',
          errorMessage: 'Empty file (0 bytes)',
          exifOrientation: 1,
        });
        continue;
      }

      try {
        // EXIF normalization
        const { canvas, width, height, orientation } = await normalizeImage(file);

        // Generate thumbnail
        const thumbCanvas = document.createElement('canvas');
        const maxThumb = 160;
        const scale = Math.min(maxThumb / width, maxThumb / height, 1);
        thumbCanvas.width = Math.max(1, Math.round(width * scale));
        thumbCanvas.height = Math.max(1, Math.round(height * scale));
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        }

        const thumbBlob = await new Promise<Blob | null>((resolve) =>
          thumbCanvas.toBlob(resolve, 'image/jpeg', 0.85)
        );
        const thumbnailUrl = thumbBlob ? URL.createObjectURL(thumbBlob) : '';

        newItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          originalSize: file.size,
          originalDimensions: { width, height },
          thumbnailUrl,
          status: 'queued',
          progressPercent: 0,
          progressStage: 'Ready to upscale',
          exifOrientation: orientation,
        });
      } catch (err) {
        newItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          originalSize: file.size,
          originalDimensions: { width: 0, height: 0 },
          thumbnailUrl: '',
          status: 'error',
          progressPercent: 0,
          progressStage: '',
          errorMessage: err instanceof Error ? err.message : 'Corrupt image file',
          exifOrientation: 1,
        });
      }
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      setAriaLiveMessage(`Added ${newItems.length} images to processing queue.`);
    }
  };

  // Queue reordering
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setQueue((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    setQueue((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) cleanupQueueItemUrls(item);
      return prev.filter((i) => i.id !== id);
    });
    setAriaLiveMessage('Item removed from queue.');
  };

  const handleUpdateItemSettings = (id: string, custom: Partial<ProcessingSettings>) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, customSettings: { ...item.customSettings, ...custom } }
          : item
      )
    );
  };

  // Cancel in-flight processing task
  const handleCancelItem = (id: string) => {
    if (activeProcessingId === id) {
      if (cancelCurrentTaskRef.current) {
        cancelCurrentTaskRef.current();
      }
      workerManager.cancelCurrent();
      isProcessingRef.current = false;
      setActiveProcessingId(null);

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'queued',
                progressPercent: 0,
                progressStage: 'Processing cancelled by user',
              }
            : item
        )
      );
      setAriaLiveMessage('Image processing was cancelled.');
    }
  };

  // Setup global clipboard paste handler for fast image pasting
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const clipboardItems = e.clipboardData.items;
      const pastedFiles: File[] = [];

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleFilesSelected(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Single item processor
  const processQueueItem = useCallback(
    async (item: QueueItem): Promise<boolean> => {
      return new Promise<boolean>(async (resolve) => {
        try {
          // Normalize source image to upright canvas
          const { canvas, width: srcW, height: srcH } = await normalizeImage(item.file);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Failed to acquire canvas context');

          const imgData = ctx.getImageData(0, 0, srcW, srcH);
          const buffer = imgData.data.buffer;

          const effectiveSettings: ProcessingSettings = {
            ...settings,
            ...item.customSettings,
          };

          // Calculate final target dimensions based on scalingMode
          let finalTargetW = effectiveSettings.targetWidth;
          let finalTargetH = effectiveSettings.targetHeight;

          if (effectiveSettings.scalingMode === 'multiplier') {
            const mult = effectiveSettings.scaleMultiplier || 2;
            finalTargetW = Math.round(srcW * mult);
            finalTargetH = Math.round(srcH * mult);
            // Clamp within 4K boundary (up to 4096px)
            finalTargetW = Math.min(Math.max(finalTargetW, 64), 4096);
            finalTargetH = Math.min(Math.max(finalTargetH, 64), 4096);
          } else if (effectiveSettings.lockAspectRatio && srcW > 0 && srcH > 0) {
            const boxW = effectiveSettings.targetWidth;
            const boxH = effectiveSettings.targetHeight;
            const aspect = srcW / srcH;
            if (boxW / boxH > aspect) {
              finalTargetH = boxH;
              finalTargetW = Math.min(3840, Math.round(boxH * aspect));
            } else {
              finalTargetW = boxW;
              finalTargetH = Math.min(2160, Math.round(boxW / aspect));
            }
          }

          // Update state to processing with accurate target dimension
          setActiveProcessingId(item.id);
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    targetDimensions: { width: finalTargetW, height: finalTargetH },
                    status: 'processing',
                    progressPercent: 2,
                    progressStage: 'Starting Web Worker pipeline...',
                  }
                : q
            )
          );
          setAriaLiveMessage(
            `Processing ${item.name} from ${srcW}x${srcH} to ${finalTargetW}x${finalTargetH}`
          );

          // Launch worker task with denoise, sinc interpolation, unsharp mask & clarity boost
          const cancelFn = workerManager.processImage({
            id: item.id,
            imageBuffer: buffer,
            sourceWidth: srcW,
            sourceHeight: srcH,
            targetWidth: finalTargetW,
            targetHeight: finalTargetH,
            resamplingMode: effectiveSettings.resamplingMode,
            sharpenEnabled: effectiveSettings.sharpenEnabled,
            sharpenStrength: effectiveSettings.sharpenStrength,
            denoiseStrength: effectiveSettings.denoiseStrength ?? 0,
            clarityBoost: effectiveSettings.clarityBoost ?? false,
            onProgress: (percent, stage) => {
              setQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id
                    ? { ...q, progressPercent: percent, progressStage: stage }
                    : q
                )
              );
            },
            onComplete: async (outBuffer, outW, outH, durationMs) => {
              try {
                // Render result onto export canvas
                const outCanvas = document.createElement('canvas');
                outCanvas.width = outW;
                outCanvas.height = outH;
                const outCtx = outCanvas.getContext('2d');
                if (!outCtx) throw new Error('Failed to export canvas');

                const clamped = new Uint8ClampedArray(outBuffer as ArrayBuffer);
                const outImageData = new ImageData(
                  clamped,
                  outW,
                  outH
                );
                outCtx.putImageData(outImageData, 0, 0);

                // Convert to user selected format & quality
                const exportBlob = await new Promise<Blob>((resBlob, rejBlob) => {
                  outCanvas.toBlob(
                    (b) => {
                      if (b) resBlob(b);
                      else rejBlob(new Error('Failed to encode image blob'));
                    },
                    effectiveSettings.exportFormat,
                    effectiveSettings.exportQuality
                  );
                });

                const outputUrl = URL.createObjectURL(exportBlob);

                setQueue((prev) =>
                  prev.map((q) =>
                    q.id === item.id
                      ? {
                          ...q,
                          status: 'done',
                          progressPercent: 100,
                          progressStage: 'Complete',
                          outputBlob: exportBlob,
                          outputUrl,
                          outputDimensions: { width: outW, height: outH },
                          outputSize: exportBlob.size,
                          processingTimeMs: durationMs,
                        }
                      : q
                  )
                );

                setAriaLiveMessage(
                  `Upscaling complete: ${item.name} (${outW}×${outH}px in ${(durationMs / 1000).toFixed(1)}s)`
                );
                resolve(true);
              } catch (exportErr) {
                setQueue((prev) =>
                  prev.map((q) =>
                    q.id === item.id
                      ? {
                          ...q,
                          status: 'error',
                          errorMessage:
                            exportErr instanceof Error ? exportErr.message : 'Export failed',
                        }
                      : q
                  )
                );
                resolve(false);
              }
            },
            onError: (errMsg) => {
              setQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id
                    ? { ...q, status: 'error', errorMessage: errMsg }
                    : q
                )
              );
              setAriaLiveMessage(`Error processing ${item.name}: ${errMsg}`);
              resolve(false);
            },
          });

          cancelCurrentTaskRef.current = cancelFn;
        } catch (err) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'error',
                    errorMessage: err instanceof Error ? err.message : 'Processing error',
                  }
                : q
            )
          );
          resolve(false);
        }
      });
    },
    [settings]
  );

  // Batch process all queued images
  const handleProcessAll = async () => {
    if (isProcessingRef.current) return;
    const pendingItems = queue.filter((i) => i.status === 'queued' || i.status === 'error');
    if (pendingItems.length === 0) return;

    isProcessingRef.current = true;
    setAriaLiveMessage(`Starting batch processing of ${pendingItems.length} images.`);

    for (let i = 0; i < pendingItems.length; i++) {
      if (!isProcessingRef.current) break;
      const item = pendingItems[i];
      await processQueueItem(item);
    }

    isProcessingRef.current = false;
    setActiveProcessingId(null);
    cancelCurrentTaskRef.current = null;
    setAriaLiveMessage('All queue processing completed.');
  };

  // Single download
  const handleDownloadSingle = (item: QueueItem) => {
    if (!item.outputBlob) return;
    const format = item.customSettings?.exportFormat || settings.exportFormat;
    const ext = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png';
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const w = item.outputDimensions?.width || settings.targetWidth;
    const h = item.outputDimensions?.height || settings.targetHeight;
    const filename = `${baseName}_upscaled_${w}x${h}.${ext}`;

    triggerFileDownload(item.outputBlob, filename);
  };

  // Pure JS Zero-dependency ZIP export
  const handleDownloadZip = async () => {
    const completedItems = queue.filter((i) => i.status === 'done' && i.outputBlob);
    if (completedItems.length === 0) return;

    setAriaLiveMessage('Packaging images into ZIP archive...');

    const zipFiles: { name: string; data: Uint8Array }[] = [];

    for (const item of completedItems) {
      if (!item.outputBlob) continue;
      const buffer = await item.outputBlob.arrayBuffer();
      const format = item.customSettings?.exportFormat || settings.exportFormat;
      const ext = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png';
      const baseName = item.name.replace(/\.[^/.]+$/, '');
      const w = item.outputDimensions?.width || settings.targetWidth;
      const h = item.outputDimensions?.height || settings.targetHeight;
      const filename = `${baseName}_upscaled_${w}x${h}.${ext}`;

      zipFiles.push({
        name: filename,
        data: new Uint8Array(buffer),
      });
    }

    const zipBlob = createZipArchive(zipFiles);
    triggerFileDownload(zipBlob, `upscaled_images_${Date.now()}.zip`);
    setAriaLiveMessage(`ZIP archive containing ${zipFiles.length} files downloaded.`);
  };

  // Preset operations
  const handleApplyPreset = (preset: Preset) => {
    setSettings(preset.settings);
    setAriaLiveMessage(`Applied preset: ${preset.name}`);
  };

  const handleSavePreset = (name: string) => {
    const newPreset: Preset = {
      id: `preset-${Date.now()}`,
      name,
      isBuiltIn: false,
      settings: { ...settings },
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    saveUserPresets(updated);
    setAriaLiveMessage(`Saved new preset: ${name}`);
  };

  const handleRenamePreset = (id: string, newName: string) => {
    const updated = presets.map((p) => (p.id === id ? { ...p, name: newName } : p));
    setPresets(updated);
    saveUserPresets(updated);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    saveUserPresets(updated);
  };

  // First active image aspect ratio for intelligent scaling
  const referenceAspectRatio =
    queue.length > 0 && queue[0].originalDimensions.width > 0
      ? queue[0].originalDimensions.width / queue[0].originalDimensions.height
      : 16 / 9;

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      {/* Screen Reader ARIA Live Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaLiveMessage}
      </div>

      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenPresets={() => setShowPresetsModal(true)}
        onOpenHelp={() => setShowInfoModal(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Compatibility notice if active */}
        {showCompatibilityNotice && (
          <CompatibilityNotice onDismiss={() => setShowCompatibilityNotice(false)} />
        )}

        {/* DropZone */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          disabled={activeProcessingId !== null}
        />

        {/* Two-column layout when queue has items */}
        {queue.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Control Panel: 5 columns on desktop */}
            <div className="lg:col-span-5 lg:sticky lg:top-20">
              <ControlPanel
                settings={settings}
                onUpdateSettings={(newSettings) =>
                  setSettings((prev) => ({ ...prev, ...newSettings }))
                }
                onProcessAll={handleProcessAll}
                isProcessing={activeProcessingId !== null}
                hasItems={queue.some((i) => i.status === 'queued' || i.status === 'error')}
                referenceAspectRatio={referenceAspectRatio}
              />
            </div>

            {/* Queue List: 7 columns on desktop */}
            <div className="lg:col-span-7">
              <QueueList
                items={queue}
                activeProcessingId={activeProcessingId}
                globalSettings={settings}
                onRemoveItem={handleRemoveItem}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onCancelItem={handleCancelItem}
                onDownloadSingle={handleDownloadSingle}
                onDownloadZip={handleDownloadZip}
                onViewComparison={(item) => setComparingItem(item)}
                onUpdateItemSettings={handleUpdateItemSettings}
                onClearAll={handleClearAll}
              />
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[#70685D] font-mono">
            Drop or select images above to begin upscaling. All processing is 100% private and offline-capable.
          </div>
        )}
      </main>

      {/* Modals */}
      {showPresetsModal && (
        <PresetsModal
          presets={presets}
          currentSettings={settings}
          isStorageWritable={isStorageWritable}
          onApplyPreset={handleApplyPreset}
          onSavePreset={handleSavePreset}
          onRenamePreset={handleRenamePreset}
          onDeletePreset={handleDeletePreset}
          onClose={() => setShowPresetsModal(false)}
        />
      )}

      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}

      {comparingItem && (
        <ComparisonViewer
          item={comparingItem}
          onClose={() => setComparingItem(null)}
          onDownload={handleDownloadSingle}
        />
      )}
    </div>
  );
}
