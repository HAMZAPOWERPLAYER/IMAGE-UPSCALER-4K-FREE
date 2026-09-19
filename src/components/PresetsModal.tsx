import React, { useState } from 'react';
import { Preset, ProcessingSettings } from '../types';
import { X, Plus, Trash2, Edit2, Check, BookmarkCheck, ShieldAlert } from 'lucide-react';

interface PresetsModalProps {
  presets: Preset[];
  currentSettings: ProcessingSettings;
  isStorageWritable: boolean;
  onApplyPreset: (preset: Preset) => void;
  onSavePreset: (name: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onDeletePreset: (id: string) => void;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  presets,
  isStorageWritable,
  onApplyPreset,
  onSavePreset,
  onRenamePreset,
  onDeletePreset,
  onClose,
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim());
    setNewPresetName('');
  };

  const handleStartRename = (preset: Preset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRenamePreset(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12100D]/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Preset Manager"
    >
      <div className="relative w-full max-w-lg bg-[#1C1814] border border-[#332B23] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#332B23] bg-[#24201B]/70">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-[#E8A33D]" aria-hidden="true" />
            <h3 className="font-semibold text-base text-[#F7F3EE]">
              Pipeline Presets
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#332B23] transition-colors"
            aria-label="Close presets modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Storage Notice if restricted */}
        {!isStorageWritable && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-[#E8A33D]/10 border border-[#E8A33D]/30 flex items-start gap-2.5 text-xs text-[#E8A33D]">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Local storage is unavailable (private mode or quota full). Presets can still be applied, but custom presets won't persist after page refresh.
            </span>
          </div>
        )}

        {/* Content list */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#A89F91]">
            Available Presets
          </label>

          <ul className="flex flex-col gap-2.5" aria-label="Preset list">
            {presets.map((p) => {
              const isEditing = editingId === p.id;
              const { targetWidth, targetHeight, resamplingMode, sharpenStrength, exportFormat } =
                p.settings;
              const formatLabel =
                exportFormat === 'image/webp'
                  ? 'WebP'
                  : exportFormat === 'image/jpeg'
                  ? 'JPG'
                  : 'PNG';

              return (
                <li
                  key={p.id}
                  className="p-3 rounded-xl bg-[#24201B] border border-[#332B23] hover:border-[#E8A33D]/40 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-[#1C1814] border border-[#E8A33D] rounded px-2 py-1 text-xs text-[#F7F3EE] flex-1"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(p.id)}
                          className="p-1 rounded bg-[#E8A33D] text-[#12100D]"
                          title="Save new name"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#F7F3EE]">
                          {p.name}
                        </span>
                        {p.isBuiltIn && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#332B23] text-[#A89F91]">
                            Built-in
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {/* Apply button */}
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPreset(p);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-[#E8A33D] text-[#12100D] hover:bg-[#F5B65B] transition-colors"
                      >
                        Apply
                      </button>

                      {/* Rename (user-only) */}
                      {!p.isBuiltIn && !isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartRename(p)}
                          className="p-1.5 rounded text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#332B23]"
                          title="Rename preset"
                        >
                          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}

                      {/* Delete (user-only) */}
                      {!p.isBuiltIn && (
                        <button
                          type="button"
                          onClick={() => onDeletePreset(p.id)}
                          className="p-1.5 rounded text-[#A89F91] hover:text-[#E05345] hover:bg-[#332B23]"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#A89F91]">
                    <span>
                      {targetWidth}×{targetHeight}
                    </span>
                    <span>•</span>
                    <span>{resamplingMode === 'lanczos' ? 'Lanczos3' : 'Bilinear'}</span>
                    <span>•</span>
                    <span>Sharpen: {sharpenStrength}%</span>
                    <span>•</span>
                    <span>{formatLabel}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Save current settings as preset */}
        <div className="p-4 border-t border-[#332B23] bg-[#24201B]/50">
          <label htmlFor="new-preset-input" className="block text-xs text-[#A89F91] mb-1.5">
            Save current settings as new preset
          </label>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              id="new-preset-input"
              type="text"
              placeholder="e.g. 4K Cinematic Grain"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="flex-1 bg-[#1C1814] border border-[#332B23] rounded-xl px-3 py-2 text-xs text-[#F7F3EE] focus:border-[#E8A33D] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newPresetName.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#E8A33D] hover:bg-[#F5B65B] disabled:opacity-50 text-[#12100D] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
