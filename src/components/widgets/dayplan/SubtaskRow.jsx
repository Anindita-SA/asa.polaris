import React from 'react';
import { Check } from 'lucide-react';

/**
 * SubtaskRow component
 * Renders an indented subtask checklist row with a 44px tap target checkbox.
 * Shows title, struck-through completed state, heuristic ~ marker, and duration badge.
 */
export default function SubtaskRow({
  item,
  task,
  onToggle
}) {
  if (!task) return null;

  const isDone = task.status === 'done' || task.completed === true;
  const isHeuristic = task.estimate_source === 'heuristic';
  const duration = task.estimated_minutes || task.time_estimate_minutes || 15;
  const durationLabel = `${isHeuristic ? '~' : ''}${duration}m`;

  return (
    <div
      className={`flex items-center justify-between gap-3 p-2 rounded-xl transition-colors ${
        isDone ? 'bg-void/40 border border-pulsar/20' : 'bg-void/60 border border-pulsar/30 hover:border-pulsar/50'
      }`}
      data-testid={`subtask-row-${task.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onToggle && onToggle(task.id)}
          className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center transition-all shrink-0 ${
            isDone
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-void/80 border-pulsar/40 text-transparent hover:border-amber-500/50'
          }`}
          aria-label={`Toggle subtask: ${task.title}`}
          data-testid={`subtask-checkbox-${task.id}`}
        >
          <Check className={`w-4 h-4 stroke-[2.5] ${isDone ? 'opacity-100 text-amber-400' : 'opacity-0'}`} />
        </button>

        <span
          className={`text-sm font-body truncate leading-snug ${
            isDone ? 'line-through text-nova/50' : 'text-starlight/90'
          }`}
          title={task.title}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item?.completed_by_slot && isDone && (
          <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            slot
          </span>
        )}
        <span
          className="text-xs font-mono text-nova/60 bg-pulsar/10 border border-pulsar/20 px-2 py-0.5 rounded"
          data-testid={`subtask-duration-${task.id}`}
        >
          {durationLabel}
        </span>
      </div>
    </div>
  );
}
