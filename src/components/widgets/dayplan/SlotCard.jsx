import React from 'react';
import { ArrowLeftRight, Play, CheckCircle2 } from 'lucide-react';
import SubtaskRow from './SubtaskRow';
import TimeboxRow from './TimeboxRow';

/**
 * SlotCard component
 * Displays Anchor (Slot 1), Support (Slots 2 and 3), or Bonus (Slot 4) cards.
 * Enforces two heading sizes only, 4-point spacing scale, and 44px tap targets.
 */
export default function SlotCard({
  slot,
  onTickBox,
  onUntickBox,
  onToggleSubtask,
  onOpenSwapModal,
  onStartFocus
}) {
  if (!slot || !slot.parentTask) return null;

  const {
    slot: slotNumber,
    type,
    parentTask,
    items = [],
    targetBoxes,
    doneBoxes,
    totalMinutes,
    remainderMinutes,
    isCleared
  } = slot;

  const isAnchor = slotNumber === 1;
  const isBonus = slotNumber === 4;

  const cardStyle = isAnchor
    ? 'border-2 border-amber-500/50 bg-void/80 rounded-2xl p-5 shadow-lg'
    : isBonus
    ? 'border border-dashed border-pulsar/25 bg-void/30 rounded-xl p-4 opacity-80'
    : 'border border-pulsar/30 bg-void/60 rounded-xl p-4';

  const badgeText = isAnchor
    ? 'ANCHOR - PRIMARY FOCUS'
    : isBonus
    ? 'BONUS (OUTSIDE CAP)'
    : `SUPPORT ${slotNumber - 1}`;

  const badgeStyle = isAnchor
    ? 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30'
    : isBonus
    ? 'text-nova/50 bg-pulsar/5 border border-pulsar/15'
    : 'text-nova/70 bg-pulsar/10 border border-pulsar/20';

  const isParentDone = parentTask.status === 'done' || parentTask.completed === true;

  return (
    <article
      className={`${cardStyle} space-y-4 transition-all`}
      data-testid={`slot-card-${slotNumber}`}
    >
      {/* 1. Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded ${badgeStyle}`}
            data-testid={`slot-badge-${slotNumber}`}
          >
            {badgeText}
          </span>

          {parentTask.category && (
            <span className="text-xs font-mono text-nova/60 bg-pulsar/10 border border-pulsar/20 px-2 py-0.5 rounded">
              {parentTask.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-nova/60" data-testid={`slot-estimate-${slotNumber}`}>
            {totalMinutes}m ({targetBoxes} boxes)
          </span>

          <button
            type="button"
            onClick={() => onOpenSwapModal && onOpenSwapModal(slotNumber)}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-pulsar/30 hover:border-amber-500/40 text-nova/60 hover:text-amber-400 flex items-center justify-center transition-all"
            aria-label={`Swap Slot ${slotNumber} task`}
            title="Swap task"
            data-testid={`swap-slot-${slotNumber}`}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Parent Task Title */}
      <div>
        <h3
          className={`text-base font-semibold font-display text-starlight leading-snug ${
            isCleared || isParentDone ? 'line-through text-nova/50' : ''
          }`}
          data-testid={`slot-title-${slotNumber}`}
        >
          {parentTask.title}
        </h3>
      </div>

      {/* 3. Chosen Subtask Checklist */}
      {items.length > 0 && (
        <div className="space-y-1.5 pt-1" data-testid={`subtasks-container-${slotNumber}`}>
          {items.map(({ item, task }) => (
            <SubtaskRow
              key={task ? task.id : item.id}
              item={item}
              task={task}
              onToggle={(taskId) => onToggleSubtask && onToggleSubtask(slotNumber, taskId)}
            />
          ))}
        </div>
      )}

      {/* 4. Timebox Tally Row */}
      <div className="pt-2 border-t border-pulsar/20">
        <TimeboxRow
          slotNumber={slotNumber}
          targetBoxes={targetBoxes}
          doneBoxes={doneBoxes}
          remainderMinutes={remainderMinutes}
          onTickBox={() => onTickBox && onTickBox(slotNumber)}
          onUntickBox={() => onUntickBox && onUntickBox(slotNumber)}
          isCleared={isCleared}
        />
      </div>

      {/* 5. Start Focus Action */}
      <div className="pt-2 flex items-center justify-between gap-3">
        {isCleared ? (
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Slot Cleared</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStartFocus && onStartFocus(slot)}
            className="min-h-[44px] px-4 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 font-display text-sm font-semibold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            data-testid={`start-focus-${slotNumber}`}
          >
            <Play className="w-4 h-4 fill-amber-400/80 stroke-none" />
            <span>Start Focus</span>
          </button>
        )}
      </div>
    </article>
  );
}
