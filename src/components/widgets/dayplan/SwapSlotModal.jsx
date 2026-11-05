import React from 'react';
import { X, ArrowRight } from 'lucide-react';

/**
 * SwapSlotModal component
 * Mobile-first modal for swapping a daily slot task in place.
 * Enforces 44px tap targets and 375px mobile responsiveness.
 */
export default function SwapSlotModal({
  isOpen,
  onClose,
  slotNumber,
  currentTaskId,
  candidates = [],
  onSelectCandidate
}) {
  if (!isOpen) return null;

  // Filter out the currently assigned task from the candidates list
  const eligible = candidates.filter(c => c.id !== currentTaskId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="swap-slot-modal"
    >
      <div className="bg-void/95 border border-pulsar/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pulsar/20">
          <div>
            <h2 className="text-base font-semibold font-display text-starlight">
              Swap Slot {slotNumber}
            </h2>
            <p className="text-xs font-mono uppercase tracking-wider text-nova/60">
              Select replacement parent task
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-pulsar/30 hover:border-pulsar/60 text-nova/60 hover:text-starlight flex items-center justify-center transition-colors"
            aria-label="Close swap modal"
            data-testid="close-swap-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate List */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          {eligible.length === 0 ? (
            <div className="p-6 text-center text-sm font-body text-nova/50">
              No eligible replacement parent tasks in backlog.
            </div>
          ) : (
            eligible.map((candidate) => {
              const duration = candidate.estimated_minutes || candidate.time_estimate_minutes || 30;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    if (onSelectCandidate) onSelectCandidate(candidate.id);
                    if (onClose) onClose();
                  }}
                  className="min-h-[44px] w-full p-3 rounded-xl border border-pulsar/30 hover:border-amber-500/50 bg-void/60 hover:bg-void/90 flex items-center justify-between gap-3 text-left transition-all group"
                  data-testid={`swap-candidate-${candidate.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-body font-medium text-starlight/90 group-hover:text-amber-400 truncate">
                      {candidate.title}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {candidate.quadrant && (
                        <span className="text-[10px] font-mono uppercase text-nova/60">
                          {candidate.quadrant.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-nova/50">
                        {duration}m
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-nova/40 group-hover:text-amber-400 shrink-0 transition-colors" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
