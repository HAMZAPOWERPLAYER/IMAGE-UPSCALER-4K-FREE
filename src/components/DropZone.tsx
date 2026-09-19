import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Shield, Cpu, Zap, Copy } from 'lucide-react';
import { SAMPLE_IMAGES, SampleImageDef } from '../utils/sample-images';

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const handleLoadSample = async (sample: SampleImageDef, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || loadingSampleId) return;
    try {
      setLoadingSampleId(sample.id);
      const file = await sample.generate();
      onFilesSelected([file]);
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload images for upscaling. Drag and drop files here or press Enter to browse."
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-6 sm:p-10 text-center group ${
          isDragOver
            ? 'border-[#E8A33D] bg-[#E8A33D]/10 scale-[0.995]'
            : 'border-[#332B23] hover:border-[#E8A33D]/60 bg-[#1C1814]/60 hover:bg-[#1C1814]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center max-w-lg mx-auto">
          {/* Animated badge / icon */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-transform duration-200 ${
              isDragOver
                ? 'bg-[#E8A33D] text-[#12100D] scale-110'
                : 'bg-[#24201B] border border-[#332B23] text-[#E8A33D] group-hover:scale-105 group-hover:border-[#E8A33D]/40'
            }`}
          >
            {isDragOver ? (
              <UploadCloud className="w-7 h-7 animate-pulse" aria-hidden="true" />
            ) : (
              <ImageIcon className="w-7 h-7" aria-hidden="true" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-semibold text-[#F7F3EE] mb-1.5 tracking-tight">
            Drop images here, or <span className="text-[#E8A33D] underline underline-offset-4">browse files</span>
          </h3>

          <p className="text-xs sm:text-sm text-[#A89F91] mb-3 max-w-md">
            Supports JPG, PNG, WebP & TIFF. EXIF auto-oriented. Zero server uploads.
          </p>

          <div className="flex items-center gap-2 text-xs text-[#70685D] mb-4 font-mono bg-[#12100D]/60 px-3 py-1.5 rounded-full border border-[#332B23]">
            <Copy className="w-3.5 h-3.5 text-[#E8A33D]" aria-hidden="true" />
            <span>Pro tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[#24201B] border border-[#332B23] text-[#F7F3EE]">Ctrl+V</kbd> anywhere to paste from clipboard</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#A89F91]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#24201B] border border-[#332B23]">
              <Sparkles className="w-3 h-3 text-[#E8A33D]" aria-hidden="true" />
              Lanczos3 Sinc
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#24201B] border border-[#332B23]">
              <Cpu className="w-3 h-3 text-[#E8A33D]" aria-hidden="true" />
              Multithreaded Worker
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#24201B] border border-[#332B23]">
              <Shield className="w-3 h-3 text-[#E8A33D]" aria-hidden="true" />
              100% Private (No limits)
            </span>
          </div>
        </div>
      </div>

      {/* 1-Click Test Samples Strip */}
      <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-[#1C1814] border border-[#332B23] gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#A89F91]">
          <Zap className="w-3.5 h-3.5 text-[#E8A33D]" aria-hidden="true" />
          <span className="font-medium text-[#F7F3EE]">Instant Test Samples:</span>
          <span className="hidden sm:inline">Try 1-click test photos to see the upscale quality:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_IMAGES.map((sample) => {
            const isLoading = loadingSampleId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={(e) => handleLoadSample(sample, e)}
                disabled={disabled || !!loadingSampleId}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#332B23] bg-[#24201B] hover:border-[#E8A33D]/60 hover:bg-[#2A241E] text-[#F7F3EE] flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-[#12100D] text-[#E8A33D]">
                  {sample.badge}
                </span>
                <span>{isLoading ? 'Generating...' : sample.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
