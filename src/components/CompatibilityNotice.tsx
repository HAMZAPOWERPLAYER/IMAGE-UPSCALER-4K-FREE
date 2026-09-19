import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CompatibilityNoticeProps {
  onDismiss: () => void;
}

export const CompatibilityNotice: React.FC<CompatibilityNoticeProps> = ({ onDismiss }) => {
  return (
    <div
      role="status"
      className="p-3.5 rounded-xl bg-[#E8A33D]/15 border border-[#E8A33D]/40 text-[#F7F3EE] flex items-center justify-between gap-3 text-xs shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-[#E8A33D] flex-shrink-0" aria-hidden="true" />
        <span>
          Running in compatibility mode — processing may briefly pause the interface.
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded text-[#A89F91] hover:text-[#F7F3EE] transition-colors"
        aria-label="Dismiss notice"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
