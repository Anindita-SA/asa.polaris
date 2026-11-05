import React from 'react';
import { Check } from 'lucide-react';

/**
 * TimeboxRow component
 * Renders 44px minimum tap target timebox chips for slot progress.
 * Displays remainder minutes on the final box if slot minutes are not a multiple of 15.
 */
export default function TimeboxRow({
  slotNumber = 1,
  targetBoxes = 1,
  doneBoxes = 0,
  remainderMinutes = 0,
  onTickBox,
  onUntickBox,
  isCleared = false
}) {
  const boxes = Array.from({ length: Math.max(1, targetBoxes) }, (_, i) => i);

  const handleBoxClick = (index) => {
    if (index < doneBoxes) {
      // Unticking: only allow clicking the highest filled box to decrement
      if (index === doneBoxes - 1 && typeof onUntickBox === 'function') {
        onUntickBox();
      }
    } else {
      // Ticking: only allow clicking the next available box
      if (index === doneBoxes && typeof onTickBox === 'function') {
        onTickBox();
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1" data-testid={`timebox-row-${slotNumber}`}>
      {boxes.map((boxIndex) => {
        const isFilled = boxIndex < doneBoxes;
        const isLastBox = boxIndex === targetBoxes - 1;
        const showRemainder = isLastBox && remainderMinutes > 0;
        const label = showRemainder ? `${remainderMinutes}m` : '15m';

        return (
          <button
            key={boxIndex}
            type="button"
            onClick={() => handleBoxClick(boxIndex)}
            className={`min-h-[44px] min-w-[44px] px-2 rounded-lg border flex items-center justify-center font-mono text-xs font-semibold transition-all select-none ${
              isFilled
                ? 'bg-amber-500 text-void border-amber-400 shadow-sm'
                : 'bg-void/60 border-pulsar/40 text-nova/60 hover:border-amber-500/60 hover:text-amber-400'
            } ${isCleared && isFilled ? 'ring-1 ring-amber-400/50' : ''}`}
            aria-label={`Box ${boxIndex + 1} of ${targetBoxes}: ${isFilled ? 'Done' : 'Open'} (${label})`}
            data-testid={`timebox-chip-${slotNumber}-${boxIndex}`}
          >
            {isFilled ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <span>{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
