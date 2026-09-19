import React from 'react';
import { Sun, Moon, ShieldCheck, Bookmark, HelpCircle } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenPresets: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenPresets,
  onOpenHelp,
}) => {
  return (
    <header className="border-b border-[#332B23] bg-[#1C1814]/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Privacy Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8A33D] flex items-center justify-center text-[#12100D] font-bold text-lg shadow-sm">
              U
            </div>
            <span className="font-bold text-xl tracking-tight text-[#F7F3EE]">
              Upscale
            </span>
          </div>

          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[#332B23]/60 text-[#E8A33D] border border-[#E8A33D]/20"
            title="All image processing runs 100% locally in your browser. No data ever leaves your device."
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#E8A33D]" aria-hidden="true" />
            <span>100% Client-Side • Private</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Presets Button */}
          <button
            type="button"
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#332B23] bg-[#24201B] hover:bg-[#332B23] text-[#F7F3EE] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A33D]"
            aria-label="Manage resolution and processing presets"
          >
            <Bookmark className="w-4 h-4 text-[#E8A33D]" aria-hidden="true" />
            <span className="hidden xs:inline">Presets</span>
          </button>

          {/* Quick Info / Guide */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="p-2 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#24201B] border border-transparent hover:border-[#332B23] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A33D]"
            aria-label="How it works and privacy guarantee"
          >
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Dark/Light Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#24201B] border border-[#332B23] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A33D]"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-[#E8A33D]" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5 text-[#E8A33D]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
