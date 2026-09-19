import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QueueItem } from '../types';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Columns,
  SplitSquareVertical,
  Search,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface ComparisonViewerProps {
  item: QueueItem;
  onClose: () => void;
  onDownload: (item: QueueItem) => void;
}

type ViewMode = 'split' | 'side-by-side' | 'loupe';

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const updateSplitFromPointer = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(Math.max((x / rect.width) * 100, 2), 98);
    setSplitPercent(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewMode !== 'split') return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSplitFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewMode === 'split' && isDragging) {
      updateSplitFromPointer(e.clientX);
    } else if (viewMode === 'loupe' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setLoupePos({ x, y, active: true });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  const handlePointerLeave = () => {
    if (viewMode === 'loupe') {
      setLoupePos((prev) => ({ ...prev, active: false }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSplitPercent((prev) => Math.max(prev - 5, 2));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPercent((prev) => Math.min(prev + 5, 98));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitPercent(2);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSplitPercent(98);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Close on Escape key globally while modal is active
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClose]);

  const origMP = ((item.originalDimensions.width * item.originalDimensions.height) / 1000000).toFixed(2);
  const outW = item.outputDimensions?.width || item.targetDimensions?.width || item.originalDimensions.width * 2;
  const outH = item.outputDimensions?.height || item.targetDimensions?.height || item.originalDimensions.height * 2;
  const outMP = ((outW * outH) / 1000000).toFixed(2);
  const densityMultiplier = (
    (outW * outH) /
    (item.originalDimensions.width * item.originalDimensions.height)
  ).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#12100D]/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Comparison viewer for ${item.name}`}
    >
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#1C1814] border border-[#332B23] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-[#332B23] bg-[#24201B] z-20 gap-2">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm sm:text-base text-[#F7F3EE] truncate max-w-[200px] sm:max-w-xs">
              {item.name}
            </h3>
            <span className="font-mono text-xs text-[#E8A33D] px-2 py-0.5 rounded bg-[#12100D] border border-[#332B23]">
              {densityMultiplier}× Pixels
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[#12100D] border border-[#332B23]">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-[#E8A33D] text-[#12100D] font-bold'
                  : 'text-[#A89F91] hover:text-[#F7F3EE]'
              }`}
              title="Split Curtain Divider"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden xs:inline">Split Curtain</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-[#E8A33D] text-[#12100D] font-bold'
                  : 'text-[#A89F91] hover:text-[#F7F3EE]'
              }`}
              title="Side-by-Side Dual View"
            >
              <Columns className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden xs:inline">Side-by-Side</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('loupe')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'loupe'
                  ? 'bg-[#E8A33D] text-[#12100D] font-bold'
                  : 'text-[#A89F91] hover:text-[#F7F3EE]'
              }`}
              title="4x Magnifier Loupe"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden xs:inline">4× Loupe</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls (split and side-by-side) */}
            {viewMode !== 'loupe' && (
              <div className="flex items-center gap-1 bg-[#12100D] p-1 rounded-lg border border-[#332B23]">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded text-[#A89F91] hover:text-[#F7F3EE] transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <span className="font-mono text-xs text-[#A89F91] px-1 min-w-[38px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 rounded text-[#A89F91] hover:text-[#F7F3EE] transition-colors"
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded text-[#A89F91] hover:text-[#F7F3EE] transition-colors"
                  title="Reset Zoom"
                  aria-label="Reset zoom to 100%"
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Download Button */}
            <button
              type="button"
              onClick={() => onDownload(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E8A33D] hover:bg-[#F5B65B] text-[#12100D] transition-colors"
              aria-label="Download upscaled image"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#332B23] transition-colors"
              aria-label="Close comparison viewer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Comparison Stage */}
        <div
          ref={containerRef}
          className={`relative flex-1 w-full overflow-hidden bg-[#12100D] select-none flex items-center justify-center ${
            viewMode === 'loupe' ? 'cursor-crosshair' : ''
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          {viewMode === 'split' && (
            <>
              {/* Zoom Wrapper */}
              <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                {/* Upscaled Result (Full background) */}
                <img
                  src={item.outputUrl || item.thumbnailUrl}
                  alt={`Upscaled result for ${item.name}`}
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />

                {/* Original (Clipped overlay) */}
                <div
                  className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
                  style={{
                    clipPath: `polygon(0 0, ${splitPercent}% 0, ${splitPercent}% 100%, 0 100%)`,
                  }}
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={`Original image for ${item.name}`}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </div>

              {/* Interactive Split Divider Handle */}
              <div
                ref={sliderRef}
                tabIndex={0}
                role="slider"
                aria-label="Before and after split comparison slider. Use left and right arrow keys to adjust."
                aria-valuenow={Math.round(splitPercent)}
                aria-valuemin={2}
                aria-valuemax={98}
                onKeyDown={handleKeyDown}
                className="absolute top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-center group focus-visible:outline-none"
                style={{ left: `${splitPercent}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-0.5 h-full bg-[#E8A33D] shadow-[0_0_10px_rgba(232,163,61,0.5)] group-hover:w-1 transition-all" />
                <div className="absolute w-8 h-8 rounded-full bg-[#E8A33D] text-[#12100D] shadow-lg flex items-center justify-center border-2 border-[#12100D] group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-[#E8A33D]/40 transition-transform">
                  <div className="flex items-center gap-0.5 text-[10px] font-bold">
                    <span>◀</span>
                    <span>▶</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {viewMode === 'side-by-side' && (
            <div
              className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-3 transition-transform duration-75 ease-out"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              {/* Left: Original */}
              <div className="relative flex flex-col items-center justify-center bg-[#1C1814] rounded-xl border border-[#332B23] overflow-hidden p-2">
                <div className="absolute top-3 left-3 z-10 font-mono text-xs px-2.5 py-1 rounded bg-[#12100D]/80 text-[#A89F91] border border-[#332B23]">
                  Original ({item.originalDimensions.width}×{item.originalDimensions.height})
                </div>
                <img
                  src={item.thumbnailUrl}
                  alt={`Original for ${item.name}`}
                  className="max-w-full max-h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Right: Upscaled */}
              <div className="relative flex flex-col items-center justify-center bg-[#1C1814] rounded-xl border border-[#E8A33D]/40 overflow-hidden p-2">
                <div className="absolute top-3 left-3 z-10 font-mono text-xs px-2.5 py-1 rounded bg-[#12100D]/80 text-[#E8A33D] border border-[#E8A33D]/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E8A33D]" aria-hidden="true" />
                  Upscaled ({outW}×{outH})
                </div>
                <img
                  src={item.outputUrl || item.thumbnailUrl}
                  alt={`Upscaled for ${item.name}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          {viewMode === 'loupe' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={item.outputUrl || item.thumbnailUrl}
                alt={`Upscaled result for ${item.name}`}
                className="max-w-full max-h-full object-contain pointer-events-none"
              />

              {/* Floating Magnifying Lens */}
              {loupePos.active && containerRef.current && (
                <div
                  className="pointer-events-none absolute z-40 rounded-full border-2 border-[#E8A33D] shadow-[0_0_25px_rgba(0,0,0,0.8)] overflow-hidden"
                  style={{
                    width: 180,
                    height: 180,
                    left: loupePos.x - 90,
                    top: loupePos.y - 90,
                    backgroundImage: `url(${item.outputUrl || item.thumbnailUrl})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${containerRef.current.clientWidth * 3.5}px ${
                      containerRef.current.clientHeight * 3.5
                    }px`,
                    backgroundPosition: `-${loupePos.x * 3.5 - 90}px -${loupePos.y * 3.5 - 90}px`,
                  }}
                >
                  <div className="absolute inset-x-0 bottom-1 flex justify-center">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#12100D]/90 text-[#E8A33D] border border-[#E8A33D]/40">
                      3.5× Loupe
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating Dimensions Labels */}
          {viewMode === 'split' && (
            <>
              <div className="absolute bottom-4 left-4 z-20 pointer-events-none font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#12100D]/85 border border-[#332B23] text-[#F7F3EE] backdrop-blur-sm shadow-md">
                <span className="text-[#A89F91] mr-1.5">Original:</span>
                {item.originalDimensions.width} × {item.originalDimensions.height} px ({origMP} MP)
              </div>

              <div className="absolute bottom-4 right-4 z-20 pointer-events-none font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#12100D]/85 border border-[#E8A33D]/40 text-[#E8A33D] backdrop-blur-sm shadow-md">
                <span className="text-[#F7F3EE] mr-1.5">Upscaled:</span>
                {outW} × {outH} px ({outMP} MP)
              </div>
            </>
          )}
        </div>

        {/* Bottom Detailed Metrics Bar */}
        <div className="px-4 py-2.5 bg-[#24201B] border-t border-[#332B23] flex flex-wrap items-center justify-between text-xs text-[#A89F91] font-mono gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#F7F3EE]">
              <CheckCircle className="w-3.5 h-3.5 text-[#52B788]" aria-hidden="true" />
              Completed in {((item.processingDurationMs || 800) / 1000).toFixed(2)}s
            </span>
            <span>
              Resampling:{' '}
              <strong className="text-[#F7F3EE]">
                {(item.settings?.resamplingMode || 'lanczos').toUpperCase()}
              </strong>
            </span>
            <span>
              Sharpening:{' '}
              <strong className="text-[#F7F3EE]">
                {item.settings?.sharpenEnabled ? `${item.settings.sharpenStrength}%` : 'Off'}
              </strong>
            </span>
            <span>
              Format:{' '}
              <strong className="text-[#E8A33D]">
                {(item.settings?.exportFormat || 'image/webp').split('/')[1]?.toUpperCase()}
              </strong>
            </span>
          </div>

          <div>
            {viewMode === 'split' ? (
              <span>Divider at {Math.round(splitPercent)}% • Drag or press ◄ / ►</span>
            ) : viewMode === 'loupe' ? (
              <span>Move cursor to inspect micro-texture details</span>
            ) : (
              <span>Synchronized zoom & inspection</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
