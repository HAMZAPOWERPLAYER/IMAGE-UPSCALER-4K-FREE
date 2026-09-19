import React from 'react';
import { X, ShieldCheck, Sparkles, Cpu, Layers, Info, CheckCircle2, Zap } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12100D]/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="About Upscale & Architecture"
    >
      <div className="relative w-full max-w-2xl bg-[#1C1814] border border-[#332B23] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#332B23] bg-[#24201B]/70">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-[#E8A33D]" aria-hidden="true" />
            <h3 className="font-semibold text-base text-[#F7F3EE]">
              About Upscale Architecture & Privacy
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#332B23] transition-colors"
            aria-label="Close information modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#F7F3EE]/90">
          {/* Section: Why Upscale is superior to Cloud Upscalers */}
          <div className="p-4 rounded-xl bg-[#24201B] border border-[#E8A33D]/40">
            <div className="flex items-center gap-2 font-semibold text-[#E8A33D] mb-2">
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Built to Outperform Cloud Upscalers</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#A89F91]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-0.5" />
                <span><strong className="text-[#F7F3EE]">Zero upload wait times:</strong> Processing starts in milliseconds on your local CPU cores without waiting to upload large files.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-0.5" />
                <span><strong className="text-[#F7F3EE]">No file limits or paywalls:</strong> Upscale unlimited images up to 4K UHD without subscriptions or watermarks.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-0.5" />
                <span><strong className="text-[#F7F3EE]">Artifact Deblocking + Clarity:</strong> Edge-preserving bilateral filter eliminates ugly JPEG macroblocks before 2-pass Lanczos3 sinc interpolation.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-0.5" />
                <span><strong className="text-[#F7F3EE]">Precision Comparison Suite:</strong> Split curtain, side-by-side, and interactive 3.5× Loupe inspector for fine details.</span>
              </li>
            </ul>
          </div>

          {/* Section 1: Privacy Guarantee */}
          <div className="p-4 rounded-xl bg-[#24201B] border border-[#332B23] flex gap-3.5 items-start">
            <ShieldCheck className="w-6 h-6 text-[#E8A33D] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="font-semibold text-sm text-[#F7F3EE] mb-1">
                Zero Cloud Uploads • 100% Private
              </h4>
              <p className="text-xs text-[#A89F91] leading-relaxed">
                Images never leave your machine. Every calculation runs entirely in your browser using client-side JavaScript, Web Workers, and HTML5 Canvas. Original EXIF tags (including GPS coordinates and camera serials) are stripped during export.
              </p>
            </div>
          </div>

          {/* Section 2: Resampling & Math */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-semibold text-[#E8A33D]">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Separable Lanczos3 Resampling</span>
            </div>
            <p className="text-xs text-[#A89F91] leading-relaxed">
              Lanczos3 uses an optimal windowed sinc reconstruction kernel: <code>L(x) = sinc(x) × sinc(x/3)</code> for <code>|x| &lt; 3</code>. To achieve maximum performance, the filter is separated into two 1D passes (horizontal then vertical) with precomputed coefficient weight tables, reducing lookups by 300% while eliminating border fringing through edge clamping.
            </p>
          </div>

          {/* Section 3: Web Worker Non-Blocking Processing */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-semibold text-[#E8A33D]">
              <Cpu className="w-4 h-4" aria-hidden="true" />
              <span>Dedicated Web Worker Thread</span>
            </div>
            <p className="text-xs text-[#A89F91] leading-relaxed">
              All pixel processing executes inside a Web Worker. Large 4K image buffers are transferred using zero-copy Transferable ArrayBuffers (<code>postMessage(msg, [buffer])</code>), keeping UI scrolling and cancellation responsive at 60 FPS even during heavy 3840×2160 rendering passes.
            </p>
          </div>

          {/* Section 4: Pure JS ZIP Writer */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-semibold text-[#E8A33D]">
              <Layers className="w-4 h-4" aria-hidden="true" />
              <span>Zero-Dependency ZIP Archiver</span>
            </div>
            <p className="text-xs text-[#A89F91] leading-relaxed">
              Batch downloads use an in-house PKZIP Store-method writer implementing IEEE 802.3 CRC-32 checksums and standard Central Directory records in pure JavaScript without external libraries.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#332B23] bg-[#24201B]/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#E8A33D] hover:bg-[#F5B65B] text-[#12100D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
