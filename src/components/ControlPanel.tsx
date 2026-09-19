import React from 'react';
import {
  ProcessingSettings,
  ResamplingMode,
  ExportFormat,
  ScalingMode,
} from '../types';
import {
  Sliders,
  Sparkles,
  Zap,
  Lock,
  Unlock,
  Play,
  Maximize2,
  Minimize2,
  Layers,
  Wand2,
} from 'lucide-react';

interface ControlPanelProps {
  settings: ProcessingSettings;
  onUpdateSettings: (newSettings: Partial<ProcessingSettings>) => void;
  onProcessAll: () => void;
  isProcessing: boolean;
  hasItems: boolean;
  referenceAspectRatio?: number;
}

const RESOLUTION_PRESETS = [
  { label: '720p HD', width: 1280, height: 720 },
  { label: '1080p FHD', width: 1920, height: 1080 },
  { label: '1440p QHD', width: 2560, height: 1440 },
  { label: '4K UHD', width: 3840, height: 2160 },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onUpdateSettings,
  onProcessAll,
  isProcessing,
  hasItems,
  referenceAspectRatio,
}) => {
  const handleWidthChange = (w: number) => {
    const clampedW = Math.min(Math.max(w, 64), 3840);
    if (settings.lockAspectRatio && referenceAspectRatio && referenceAspectRatio > 0) {
      const computedH = Math.min(Math.max(Math.round(clampedW / referenceAspectRatio), 64), 2160);
      onUpdateSettings({ targetWidth: clampedW, targetHeight: computedH });
    } else {
      onUpdateSettings({ targetWidth: clampedW });
    }
  };

  const handleHeightChange = (h: number) => {
    const clampedH = Math.min(Math.max(h, 64), 2160);
    if (settings.lockAspectRatio && referenceAspectRatio && referenceAspectRatio > 0) {
      const computedW = Math.min(Math.max(Math.round(clampedH * referenceAspectRatio), 64), 3840);
      onUpdateSettings({ targetWidth: computedW, targetHeight: clampedH });
    } else {
      onUpdateSettings({ targetHeight: clampedH });
    }
  };

  const applyPresetResolution = (w: number, h: number) => {
    if (settings.lockAspectRatio && referenceAspectRatio && referenceAspectRatio > 0) {
      if (w / h > referenceAspectRatio) {
        const fitW = Math.min(3840, Math.round(h * referenceAspectRatio));
        onUpdateSettings({ targetWidth: fitW, targetHeight: h, scalingMode: 'dimensions' });
      } else {
        const fitH = Math.min(2160, Math.round(w / referenceAspectRatio));
        onUpdateSettings({ targetWidth: w, targetHeight: fitH, scalingMode: 'dimensions' });
      }
    } else {
      onUpdateSettings({ targetWidth: w, targetHeight: h, scalingMode: 'dimensions' });
    }
  };

  const isLossy = settings.exportFormat === 'image/jpeg' || settings.exportFormat === 'image/webp';
  const megapixels = ((settings.targetWidth * settings.targetHeight) / 1000000).toFixed(2);

  return (
    <div className="bg-[#1C1814] border border-[#332B23] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#332B23] gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#E8A33D]" aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-semibold text-[#F7F3EE]">
            Upscale Pipeline Settings
          </h2>
        </div>
        <div className="font-mono text-xs text-[#A89F91] px-2.5 py-1 rounded-lg bg-[#24201B] border border-[#332B23]">
          {settings.scalingMode === 'multiplier' ? (
            <span className="text-[#E8A33D] font-bold">{settings.scaleMultiplier}× Native Scale</span>
          ) : (
            <span>{settings.targetWidth} × {settings.targetHeight} px ({megapixels} MP)</span>
          )}
        </div>
      </div>

      {/* Primary Scale Mode Tabs: Multiplier vs Exact Dimensions */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#A89F91] mb-2.5">
          Upscaling Mode
        </label>
        <div className="grid grid-cols-2 p-1 bg-[#12100D] border border-[#332B23] rounded-xl gap-1">
          <button
            type="button"
            onClick={() => onUpdateSettings({ scalingMode: 'multiplier' })}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              settings.scalingMode === 'multiplier'
                ? 'bg-[#E8A33D] text-[#12100D] shadow-sm font-bold'
                : 'text-[#A89F91] hover:text-[#F7F3EE]'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Scale Multiplier (2× / 4×)</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ scalingMode: 'dimensions' })}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              settings.scalingMode === 'dimensions'
                ? 'bg-[#E8A33D] text-[#12100D] shadow-sm font-bold'
                : 'text-[#A89F91] hover:text-[#F7F3EE]'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exact Target (HD / 4K)</span>
          </button>
        </div>
      </div>

      {/* Multiplier Mode Controls */}
      {settings.scalingMode === 'multiplier' ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#24201B] border border-[#332B23]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F7F3EE] uppercase tracking-wider">
              Enlargement Multiplier
            </span>
            <span className="font-mono text-sm font-bold text-[#E8A33D]">
              {settings.scaleMultiplier}× Magnification
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((mult) => {
              const isSelected = settings.scaleMultiplier === mult;
              return (
                <button
                  key={mult}
                  type="button"
                  onClick={() => onUpdateSettings({ scaleMultiplier: mult })}
                  className={`py-3 px-4 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-[#E8A33D] text-[#12100D] border-[#E8A33D] font-bold shadow-md'
                      : 'bg-[#1C1814] text-[#F7F3EE] border-[#332B23] hover:border-[#E8A33D]/60 hover:bg-[#2A241E]'
                  }`}
                >
                  <div className="text-base font-mono">{mult}×</div>
                  <div className={`text-[11px] ${isSelected ? 'text-[#12100D]/80' : 'text-[#A89F91]'}`}>
                    {mult === 2 ? 'Double size' : mult === 3 ? 'Triple size' : 'Ultra 4K'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-xs text-[#A89F91] mb-1 font-mono">
              <span>Fine Custom Scale</span>
              <span>{settings.scaleMultiplier}×</span>
            </div>
            <input
              type="range"
              min="1.2"
              max="4.0"
              step="0.1"
              value={settings.scaleMultiplier}
              onChange={(e) => onUpdateSettings({ scaleMultiplier: parseFloat(e.target.value) })}
              className="w-full"
              aria-label="Custom scale multiplier"
            />
          </div>

          <p className="text-[11px] text-[#A89F91] leading-relaxed">
            Batch-friendly: Each image is upscaled proportionally to its individual aspect ratio without distortion or cropping.
          </p>
        </div>
      ) : (
        /* Target Dimensions Mode Controls */
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A89F91] mb-2">
              Resolution Targets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESOLUTION_PRESETS.map((res) => {
                const isMatch =
                  settings.targetWidth === res.width && settings.targetHeight === res.height;
                return (
                  <button
                    key={res.label}
                    type="button"
                    onClick={() => applyPresetResolution(res.width, res.height)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                      isMatch
                        ? 'bg-[#E8A33D] text-[#12100D] border-[#E8A33D] font-bold shadow-md'
                        : 'bg-[#24201B] text-[#F7F3EE] border-[#332B23] hover:border-[#E8A33D]/60 hover:bg-[#2A241E]'
                    }`}
                    aria-pressed={isMatch}
                  >
                    <div>{res.label}</div>
                    <div className={isMatch ? 'text-[#12100D]/80' : 'text-[#A89F91]'}>
                      {res.width}×{res.height}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Dimensions + Aspect Ratio Lock */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <label htmlFor="custom-width" className="block text-xs text-[#A89F91] mb-1 font-mono">
                Width (max 3840px)
              </label>
              <div className="relative">
                <input
                  id="custom-width"
                  type="number"
                  min="64"
                  max="3840"
                  step="2"
                  value={settings.targetWidth}
                  onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 64)}
                  className="w-full bg-[#24201B] border border-[#332B23] rounded-xl px-3 py-2 font-mono text-sm text-[#F7F3EE] focus:border-[#E8A33D] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#70685D] font-mono">px</span>
              </div>
            </div>

            {/* Lock toggle button */}
            <div className="flex justify-center pt-5 sm:pt-4">
              <button
                type="button"
                onClick={() => onUpdateSettings({ lockAspectRatio: !settings.lockAspectRatio })}
                className={`p-2.5 rounded-xl border transition-colors ${
                  settings.lockAspectRatio
                    ? 'bg-[#E8A33D]/15 border-[#E8A33D] text-[#E8A33D]'
                    : 'bg-[#24201B] border-[#332B23] text-[#70685D] hover:text-[#A89F91]'
                }`}
                title={settings.lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                aria-label={settings.lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              >
                {settings.lockAspectRatio ? (
                  <Lock className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Unlock className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>

            <div>
              <label htmlFor="custom-height" className="block text-xs text-[#A89F91] mb-1 font-mono">
                Height (max 2160px)
              </label>
              <div className="relative">
                <input
                  id="custom-height"
                  type="number"
                  min="64"
                  max="2160"
                  step="2"
                  value={settings.targetHeight}
                  onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 64)}
                  className="w-full bg-[#24201B] border border-[#332B23] rounded-xl px-3 py-2 font-mono text-sm text-[#F7F3EE] focus:border-[#E8A33D] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#70685D] font-mono">px</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resampling Mode Selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#A89F91] mb-2">
          Resampling Engine
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ resamplingMode: 'lanczos' as ResamplingMode })}
            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              settings.resamplingMode === 'lanczos'
                ? 'bg-[#E8A33D]/10 border-[#E8A33D] text-[#F7F3EE]'
                : 'bg-[#24201B] border-[#332B23] text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#2A241E]'
            }`}
            aria-pressed={settings.resamplingMode === 'lanczos'}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-[#F7F3EE]">
              <Sparkles className="w-3.5 h-3.5 text-[#E8A33D]" aria-hidden="true" />
              Lanczos3 (Sinc Filter)
            </div>
            <p className="text-xs text-[#A89F91] mt-1 line-clamp-2">
              Optimal 2-pass windowed sinc interpolation. Crisp reconstruction of fine edges.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ resamplingMode: 'bilinear' as ResamplingMode })}
            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              settings.resamplingMode === 'bilinear'
                ? 'bg-[#E8A33D]/10 border-[#E8A33D] text-[#F7F3EE]'
                : 'bg-[#24201B] border-[#332B23] text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#2A241E]'
            }`}
            aria-pressed={settings.resamplingMode === 'bilinear'}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-[#F7F3EE]">
              <Zap className="w-3.5 h-3.5 text-[#A89F91]" aria-hidden="true" />
              Bilinear (Fast)
            </div>
            <p className="text-xs text-[#A89F91] mt-1 line-clamp-2">
              Weighted bilinear interpolation. Fast processing speed, softer visual edges.
            </p>
          </button>
        </div>
      </div>

      {/* Advanced Quality & Artifact Optimization Controls */}
      <div className="p-4 rounded-xl bg-[#24201B] border border-[#332B23] flex flex-col gap-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#F7F3EE] flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-[#E8A33D]" aria-hidden="true" />
          <span>Artifact Suppression & Sharpening</span>
        </div>

        {/* JPEG Artifact Denoise */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="denoise-slider" className="text-xs font-medium text-[#A89F91]">
              JPEG Artifact Denoising (Bilateral Filter)
            </label>
            <span className="font-mono text-xs text-[#E8A33D]">
              {settings.denoiseStrength > 0 ? `${settings.denoiseStrength}%` : 'Off'}
            </span>
          </div>
          <input
            id="denoise-slider"
            type="range"
            min="0"
            max="60"
            step="5"
            value={settings.denoiseStrength}
            onChange={(e) => onUpdateSettings({ denoiseStrength: parseInt(e.target.value, 10) })}
            className="w-full"
            aria-label="Denoising strength"
          />
          <div className="flex justify-between text-[11px] text-[#70685D] font-mono mt-0.5">
            <span>Off</span>
            <span>Subtle (15%)</span>
            <span>Heavy (40%+)</span>
          </div>
        </div>

        {/* Unsharp Masking */}
        <div className="pt-2 border-t border-[#332B23]/70">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <input
                id="sharpen-toggle"
                type="checkbox"
                checked={settings.sharpenEnabled}
                onChange={(e) => onUpdateSettings({ sharpenEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-[#332B23] text-[#E8A33D] focus:ring-[#E8A33D] focus:ring-offset-0 bg-[#1C1814] cursor-pointer"
              />
              <label htmlFor="sharpen-toggle" className="text-xs font-medium text-[#F7F3EE] cursor-pointer">
                Unsharp Mask Micro-Sharpening
              </label>
            </div>
            <span className="font-mono text-xs text-[#E8A33D]">
              {settings.sharpenEnabled ? `${settings.sharpenStrength}%` : 'Disabled'}
            </span>
          </div>

          {settings.sharpenEnabled && (
            <div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.sharpenStrength}
                onChange={(e) => onUpdateSettings({ sharpenStrength: parseInt(e.target.value, 10) })}
                className="w-full"
                aria-label="Sharpening strength percentage"
              />
              <div className="flex justify-between text-[11px] text-[#70685D] font-mono mt-0.5">
                <span>Subtle (10%)</span>
                <span>Balanced (25%)</span>
                <span>Intense (75%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Clarity Boost */}
        <div className="pt-2 border-t border-[#332B23]/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              id="clarity-toggle"
              type="checkbox"
              checked={settings.clarityBoost}
              onChange={(e) => onUpdateSettings({ clarityBoost: e.target.checked })}
              className="w-4 h-4 rounded border-[#332B23] text-[#E8A33D] focus:ring-[#E8A33D] focus:ring-offset-0 bg-[#1C1814] cursor-pointer"
            />
            <label htmlFor="clarity-toggle" className="text-xs font-medium text-[#F7F3EE] cursor-pointer">
              Dynamic Clarity & Micro-Contrast
            </label>
          </div>
          <span className="font-mono text-xs text-[#E8A33D]">
            {settings.clarityBoost ? 'Active' : 'Off'}
          </span>
        </div>
      </div>

      {/* Export Format & Quality */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A89F91] mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['image/webp', 'image/jpeg', 'image/png'] as ExportFormat[]).map((fmt) => {
              const label = fmt === 'image/webp' ? 'WebP' : fmt === 'image/jpeg' ? 'JPEG' : 'PNG';
              const isSelected = settings.exportFormat === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onUpdateSettings({ exportFormat: fmt })}
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    isSelected
                      ? 'bg-[#E8A33D] text-[#12100D] border-[#E8A33D] font-bold shadow-sm'
                      : 'bg-[#24201B] text-[#F7F3EE] border-[#332B23] hover:border-[#E8A33D]/60'
                  }`}
                  aria-pressed={isSelected}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A89F91] mb-2">
            Output Quality
          </label>
          {isLossy ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#A89F91]">Compression</span>
                <span className="font-mono text-xs text-[#E8A33D]">
                  {Math.round(settings.exportQuality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="2"
                value={Math.round(settings.exportQuality * 100)}
                onChange={(e) =>
                  onUpdateSettings({ exportQuality: parseInt(e.target.value, 10) / 100 })
                }
                className="w-full"
                aria-label="Export quality percentage"
              />
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded-lg bg-[#24201B] border border-[#332B23] text-xs font-mono text-[#A89F91]">
              Lossless (100% Quality)
            </div>
          )}
        </div>
      </div>

      {/* Main CTA Process All */}
      <button
        type="button"
        onClick={onProcessAll}
        disabled={!hasItems || isProcessing}
        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-all focus-visible:outline-2 focus-visible:outline-[#E8A33D] ${
          !hasItems
            ? 'bg-[#332B23] text-[#70685D] cursor-not-allowed'
            : isProcessing
            ? 'bg-[#E8A33D]/70 text-[#12100D] cursor-wait'
            : 'bg-[#E8A33D] hover:bg-[#F5B65B] text-[#12100D] hover:shadow-[#E8A33D]/20 active:scale-[0.99]'
        }`}
      >
        <Play className="w-4 h-4 fill-current" aria-hidden="true" />
        <span>
          {isProcessing
            ? 'Processing Queue in Web Worker...'
            : settings.scalingMode === 'multiplier'
            ? `Upscale All Images (${settings.scaleMultiplier}×)`
            : 'Process All Images'}
        </span>
      </button>
    </div>
  );
};
