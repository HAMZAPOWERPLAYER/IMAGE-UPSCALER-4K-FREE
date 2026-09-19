import React, { useState } from 'react';
import { QueueItem, ProcessingSettings } from '../types';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  XCircle,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Archive,
  Eye,
} from 'lucide-react';

interface QueueListProps {
  items: QueueItem[];
  activeProcessingId: string | null;
  globalSettings: ProcessingSettings;
  onRemoveItem: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onCancelItem: (id: string) => void;
  onDownloadSingle: (item: QueueItem) => void;
  onDownloadZip: () => void;
  onViewComparison: (item: QueueItem) => void;
  onUpdateItemSettings: (id: string, custom: Partial<ProcessingSettings>) => void;
  onClearAll: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const QueueList: React.FC<QueueListProps> = ({
  items,
  activeProcessingId,
  globalSettings,
  onRemoveItem,
  onMoveUp,
  onMoveDown,
  onCancelItem,
  onDownloadSingle,
  onDownloadZip,
  onViewComparison,
  onUpdateItemSettings,
  onClearAll,
}) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.status === 'done').length;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1C1814] border border-[#332B23] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#332B23]">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#F7F3EE]">
            Image Queue
          </h2>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#332B23] text-[#A89F91]">
            {items.length} {items.length === 1 ? 'file' : 'files'}
          </span>
          {completedCount > 0 && (
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#3EAE66]/15 text-[#3EAE66] border border-[#3EAE66]/30">
              {completedCount} completed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Download all as ZIP button */}
          {completedCount > 0 && (
            <button
              type="button"
              onClick={onDownloadZip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E8A33D] hover:bg-[#F5B65B] text-[#12100D] transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-[#E8A33D]"
              aria-label="Download all completed upscaled images in a single ZIP archive"
            >
              <Archive className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download All as ZIP</span>
            </button>
          )}

          {/* Clear all */}
          <button
            type="button"
            onClick={onClearAll}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#24201B] border border-[#332B23] transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Queue items list */}
      <ul className="flex flex-col gap-3" aria-label="List of queued images">
        {items.map((item, index) => {
          const isProcessing = item.status === 'processing' || item.id === activeProcessingId;
          const isExpanded = expandedItemId === item.id;
          const effectiveSettings = { ...globalSettings, ...item.customSettings };

          const projectedW =
            item.outputDimensions?.width ||
            (effectiveSettings.scalingMode === 'multiplier'
              ? Math.round(item.originalDimensions.width * effectiveSettings.scaleMultiplier)
              : effectiveSettings.targetWidth);

          const projectedH =
            item.outputDimensions?.height ||
            (effectiveSettings.scalingMode === 'multiplier'
              ? Math.round(item.originalDimensions.height * effectiveSettings.scaleMultiplier)
              : effectiveSettings.targetHeight);

          return (
            <li
              key={item.id}
              className={`rounded-xl border transition-all ${
                isProcessing
                  ? 'bg-[#24201B] border-[#E8A33D] shadow-md shadow-[#E8A33D]/5'
                  : item.status === 'done'
                  ? 'bg-[#1C1814] border-[#332B23] hover:border-[#3EAE66]/40'
                  : item.status === 'error'
                  ? 'bg-[#1C1814] border-[#E05345]/50'
                  : 'bg-[#1C1814] border-[#332B23] hover:border-[#332B23]'
              }`}
            >
              <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#24201B] border border-[#332B23] flex-shrink-0">
                    <img
                      src={item.thumbnailUrl}
                      alt={`Thumbnail of ${item.name}`}
                      className="w-full h-full object-cover"
                    />
                    {item.exifOrientation > 1 && (
                      <span
                        className="absolute bottom-0.5 right-0.5 text-[9px] font-mono px-1 rounded bg-[#12100D]/80 text-[#E8A33D]"
                        title={`EXIF orientation ${item.exifOrientation} corrected`}
                      >
                        EXIF
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#F7F3EE] truncate max-w-[220px] sm:max-w-xs">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono text-[#A89F91]">
                      <span>
                        {item.originalDimensions.width}×{item.originalDimensions.height}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(item.originalSize)}</span>
                      <span>→</span>
                      <span className="text-[#E8A33D] font-medium">
                        {projectedW}×{projectedH}
                        {effectiveSettings.scalingMode === 'multiplier' && (
                          <span className="ml-1 text-[10px] text-[#A89F91]">
                            ({effectiveSettings.scaleMultiplier}×)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {item.status === 'queued' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A89F91] bg-[#24201B] px-2 py-0.5 rounded border border-[#332B23]">
                          <Clock className="w-3 h-3 text-[#A89F91]" aria-hidden="true" />
                          <span>Queued</span>
                        </span>
                      )}

                      {item.status === 'processing' && (
                        <div className="flex items-center gap-2 w-full sm:w-64">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#E8A33D] font-medium animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-[#E8A33D] animate-ping" />
                            <span>{item.progressPercent}%</span>
                          </span>
                          <div className="flex-1 bg-[#24201B] h-1.5 rounded-full overflow-hidden border border-[#332B23]">
                            <div
                              className="bg-[#E8A33D] h-full transition-all duration-150"
                              style={{ width: `${Math.max(item.progressPercent, 4)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#A89F91] truncate font-mono">
                            {item.progressStage}
                          </span>
                        </div>
                      )}

                      {item.status === 'done' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3EAE66] bg-[#3EAE66]/10 px-2 py-0.5 rounded border border-[#3EAE66]/30">
                          <CheckCircle2 className="w-3 h-3 text-[#3EAE66]" aria-hidden="true" />
                          <span>
                            Done in{' '}
                            {item.processingTimeMs ? `${(item.processingTimeMs / 1000).toFixed(1)}s` : 'completed'}
                          </span>
                          {item.outputSize && (
                            <span className="text-[#A89F91]">({formatBytes(item.outputSize)})</span>
                          )}
                        </span>
                      )}

                      {item.status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#E05345] bg-[#E05345]/10 px-2 py-0.5 rounded border border-[#E05345]/30">
                          <AlertCircle className="w-3 h-3 text-[#E05345]" aria-hidden="true" />
                          <span>{item.errorMessage || 'Processing failed'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-center">
                  {/* Inspect comparison button */}
                  {item.status === 'done' && (
                    <button
                      type="button"
                      onClick={() => onViewComparison(item)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#24201B] hover:bg-[#332B23] text-[#F7F3EE] border border-[#332B23] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A33D]"
                      title="Inspect before/after comparison"
                      aria-label={`View before and after comparison for ${item.name}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E8A33D]" aria-hidden="true" />
                      <span className="hidden xs:inline">Compare</span>
                    </button>
                  )}

                  {/* Individual Download */}
                  {item.status === 'done' && (
                    <button
                      type="button"
                      onClick={() => onDownloadSingle(item)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#E8A33D]/15 hover:bg-[#E8A33D]/25 text-[#E8A33D] border border-[#E8A33D]/40 transition-colors"
                      title="Download upscaled image"
                      aria-label={`Download upscaled version of ${item.name}`}
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="hidden xs:inline">Download</span>
                    </button>
                  )}

                  {/* Cancel if processing */}
                  {isProcessing && (
                    <button
                      type="button"
                      onClick={() => onCancelItem(item.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#E05345]/20 hover:bg-[#E05345]/30 text-[#E05345] border border-[#E05345]/40 transition-colors"
                      title="Cancel in-flight task"
                      aria-label={`Cancel processing for ${item.name}`}
                    >
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Cancel</span>
                    </button>
                  )}

                  {/* Reorder Up */}
                  <button
                    type="button"
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0 || isProcessing}
                    className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#24201B] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label={`Move ${item.name} up in queue`}
                  >
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {/* Reorder Down */}
                  <button
                    type="button"
                    onClick={() => onMoveDown(index)}
                    disabled={index === items.length - 1 || isProcessing}
                    className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#24201B] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label={`Move ${item.name} down in queue`}
                  >
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {/* Per-item settings expander toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F7F3EE] hover:bg-[#24201B] transition-colors"
                    aria-label={isExpanded ? 'Collapse custom settings' : 'Expand custom settings'}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>

                  {/* Remove item */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#E05345] hover:bg-[#24201B] transition-colors"
                    aria-label={`Remove ${item.name} from queue`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Per-Item Custom Settings Override Panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-[#332B23]/70 bg-[#12100D]/30 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between text-[#A89F91]">
                    <span className="font-semibold uppercase tracking-wider">
                      Item Override Settings
                    </span>
                    <span className="text-[11px] font-mono">
                      (Overrides global pipeline for this file)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#A89F91] mb-1 font-mono">Target Width</label>
                      <input
                        type="number"
                        min="64"
                        max="3840"
                        value={effectiveSettings.targetWidth}
                        onChange={(e) =>
                          onUpdateItemSettings(item.id, {
                            targetWidth: parseInt(e.target.value, 10) || 64,
                          })
                        }
                        className="w-full bg-[#24201B] border border-[#332B23] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F7F3EE]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A89F91] mb-1 font-mono">Target Height</label>
                      <input
                        type="number"
                        min="64"
                        max="2160"
                        value={effectiveSettings.targetHeight}
                        onChange={(e) =>
                          onUpdateItemSettings(item.id, {
                            targetHeight: parseInt(e.target.value, 10) || 64,
                          })
                        }
                        className="w-full bg-[#24201B] border border-[#332B23] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F7F3EE]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A89F91] mb-1 font-mono">Sharpen Strength</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={effectiveSettings.sharpenStrength}
                          onChange={(e) =>
                            onUpdateItemSettings(item.id, {
                              sharpenStrength: parseInt(e.target.value, 10),
                              sharpenEnabled: true,
                            })
                          }
                          className="flex-1"
                        />
                        <span className="font-mono text-[#E8A33D] w-8">
                          {effectiveSettings.sharpenStrength}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
