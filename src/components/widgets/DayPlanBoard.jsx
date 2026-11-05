import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import { offlineSelect, offlineUpsert, offlineUpdate } from '../../lib/offlineApi';
import db from '../../lib/offlineStore';
import { Flame, ChevronDown, ChevronRight, Zap, Undo2 } from 'lucide-react';
import SlotCard from './dayplan/SlotCard';
import SwapSlotModal from './dayplan/SwapSlotModal';
import RoutineDrawer from './dayplan/RoutineDrawer';

export const FF_NEW_BOARD = 'polaris_ff_new_board';

/**
 * Checks whether the new Day Plan Board feature flag is enabled.
 * Defaults to false (legacy widget stays active default until explicitly enabled).
 */
export function isNewBoardEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const val = localStorage.getItem(FF_NEW_BOARD);
    return val === 'true' || val === 'on';
  } catch (e) {
    return false;
  }
}

/**
 * Sets the new Day Plan Board feature flag.
 */
export function setNewBoardEnabled(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(FF_NEW_BOARD, enabled ? 'true' : 'false');
  } catch (e) {}
}

const ENERGY_TIERS = ['Low', 'Medium', 'High', 'Unwell'];

/**
 * DayPlanBoard component
 * Single-column, mobile-first Daily Plan Board adhering to the 1-Day Plan invariant.
 * Zero localStorage state, two heading sizes only, 4-point spacing scale, 44px tap targets.
 */
export default function DayPlanBoard({
  todayStr: propTodayStr,
  allBacklogTasks = [],
  onStartPomodoro
}) {
  const { user } = useAuth();
  const todayStr = useMemo(() => propTodayStr || new Date().toLocaleDateString('en-CA'), [propTodayStr]);

  const {
    todayStr: activeDate,
    slots,
    loading,
    undoState,
    tickBox,
    untickBox,
    toggleSubtask,
    swapSlot,
    undoLastAction
  } = useDailyPlan(todayStr);

  const [activeEnergyTier, setActiveEnergyTier] = useState('Medium');
  const [activeMode, setActiveMode] = useState('Normal');
  const [swapModalSlot, setSwapModalSlot] = useState(null);
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [isQuickWinsOpen, setIsQuickWinsOpen] = useState(false);

  // Load energy tier and day mode from day_state
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await offlineSelect('day_state', { user_id: user.id, day: todayStr });
        if (data && data[0]) {
          if (data[0].energy_tier) setActiveEnergyTier(data[0].energy_tier);
          if (data[0].unwell) setActiveEnergyTier('Unwell');
        }
      } catch (err) {
        console.warn('[DayPlanBoard] Error reading day_state:', err);
      }
    })();
  }, [user?.id, todayStr]);

  // Handle Energy Tier Selection
  const handleSelectEnergyTier = async (tier) => {
    setActiveEnergyTier(tier);
    if (!user?.id) return;
    try {
      const isUnwell = tier === 'Unwell';
      await offlineUpsert('day_state', {
        user_id: user.id,
        day: todayStr,
        energy_tier: tier,
        unwell: isUnwell,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[DayPlanBoard] Error saving energy tier:', err);
    }
  };

  // Day Progress Calculation (strictly measures Slot Minutes across Slots 1, 2, and 3)
  const { plannedMinutes, doneMinutes, progressPercent } = useMemo(() => {
    const primarySlots = slots.filter(s => s.slot <= 3);
    const planned = primarySlots.reduce((acc, s) => acc + (s.totalMinutes || 0), 0);
    const done = primarySlots.reduce((acc, s) => {
      const slotDoneMins = Math.min(s.totalMinutes, s.doneBoxes * 15);
      return acc + slotDoneMins;
    }, 0);
    const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0;
    return { plannedMinutes: planned, doneMinutes: done, progressPercent: pct };
  }, [slots]);

  // Backlog pool and quick wins categorization
  const { candidatePool, quickWins } = useMemo(() => {
    const assignedTaskIds = new Set(slots.map(s => s.parentTask?.id).filter(Boolean));
    const openTasks = allBacklogTasks.filter(t => t.status !== 'done' && !t.completed && !t.archived);

    // Candidates for pool: open parent or standalone tasks not in current slots
    const pool = openTasks.filter(t => {
      if (t.parent_task_id !== null && t.parent_task_id !== undefined) return false;
      return !assignedTaskIds.has(t.id);
    });

    // Quick wins: open standalone tasks with duration < 15 min or mental_load low
    const qw = openTasks.filter(t => {
      if (t.parent_task_id !== null && t.parent_task_id !== undefined) return false;
      const mins = t.estimated_minutes || t.time_estimate_minutes || 0;
      return mins > 0 && mins < 15;
    });

    return { candidatePool: pool, quickWins: qw };
  }, [allBacklogTasks, slots]);

  // Handle Start Focus
  const handleStartFocus = useCallback((slot) => {
    const targetTask = slot.parentTask;
    if (!targetTask) return;

    if (typeof onStartPomodoro === 'function') {
      onStartPomodoro(targetTask);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-start-pomodoro', {
        detail: {
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          slotNumber: slot.slot,
          planId: slot.plan?.id
        }
      }));
    }
  }, [onStartPomodoro]);

  // Listen for PomodoroTimer completion events to advance box
  useEffect(() => {
    const handlePomodoroCompleted = (e) => {
      const { planId, slotNumber } = e.detail || {};
      if (slotNumber) {
        tickBox(slotNumber, { source: 'timer' });
      } else if (planId) {
        const matching = slots.find(s => s.plan?.id === planId);
        if (matching) {
          tickBox(matching.slot, { source: 'timer' });
        }
      }
    };

    window.addEventListener('polaris-pomodoro-completed', handlePomodoroCompleted);
    return () => window.removeEventListener('polaris-pomodoro-completed', handlePomodoroCompleted);
  }, [slots, tickBox]);

  const currentSwappingSlot = slots.find(s => s.slot === swapModalSlot) || null;

  return (
    <section
      className="w-full max-w-3xl mx-auto space-y-4"
      aria-label="Daily Plan Board"
      data-testid="day-plan-board"
    >
      {/* 1. Header Strip: Date, Mode, Energy Tier & Day Progress Bar */}
      <header className="border border-pulsar/30 bg-void/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date & Mode Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-starlight bg-pulsar/10 border border-pulsar/30 px-2.5 py-1 rounded-lg">
              {activeDate}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeMode} Mode</span>
            </span>
          </div>

          {/* Energy Tier Selector Pills */}
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Energy Tier">
            {ENERGY_TIERS.map((tier) => {
              const isActive = activeEnergyTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleSelectEnergyTier(tier)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-void border border-amber-400 shadow-sm'
                      : 'bg-void/60 text-nova/60 border border-pulsar/30 hover:border-pulsar/60 hover:text-nova/80'
                  }`}
                  role="radio"
                  aria-checked={isActive}
                  data-testid={`energy-tier-${tier.toLowerCase()}`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Focus Progress Bar (Slot Minutes) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-nova/60 uppercase tracking-wider">
              Primary Focus Progress
            </span>
            <span className="text-starlight font-semibold" data-testid="focus-progress-label">
              {doneMinutes} / {plannedMinutes}m ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-void/80 border border-pulsar/30 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              data-testid="focus-progress-bar"
            />
          </div>
        </div>
      </header>

      {/* 2. Slot Cards (One Column Discipline) */}
      <div className="space-y-4" data-testid="slots-container">
        {loading && slots.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-nova/50 border border-pulsar/20 rounded-2xl">
            Loading daily plan...
          </div>
        ) : slots.length === 0 ? (
          <div className="p-8 text-center space-y-2 border border-pulsar/20 rounded-2xl bg-void/40">
            <p className="text-base font-semibold font-display text-starlight">
              No tasks scheduled for today.
            </p>
            <p className="text-xs font-mono text-nova/60">
              Pick tasks from the Pool below to create your daily slots.
            </p>
          </div>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot.slot}
              slot={slot}
              onTickBox={tickBox}
              onUntickBox={untickBox}
              onToggleSubtask={toggleSubtask}
              onOpenSwapModal={(slotNum) => setSwapModalSlot(slotNum)}
              onStartFocus={handleStartFocus}
            />
          ))
        )}
      </div>

      {/* 3. Collapsed Routine Drawer */}
      <RoutineDrawer
        userId={user?.id}
        todayStr={activeDate}
      />

      {/* 4. Collapsed Backlog Drawers: Pool & Quick Wins */}
      <div className="space-y-3 pt-2">
        {/* Pool Accordion */}
        <div className="border border-pulsar/30 bg-void/40 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPoolOpen(prev => !prev)}
            className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left hover:bg-void/60 transition-colors"
            data-testid="toggle-pool-drawer"
          >
            <div className="flex items-center gap-2">
              {isPoolOpen ? <ChevronDown className="w-4 h-4 text-nova/60" /> : <ChevronRight className="w-4 h-4 text-nova/60" />}
              <span className="text-base font-semibold font-display text-starlight">
                Pool ({candidatePool.length} candidate tasks)
              </span>
            </div>
            <span className="text-xs font-mono text-nova/50 uppercase">Backlog</span>
          </button>

          {isPoolOpen && (
            <div className="p-4 pt-1 space-y-2 border-t border-pulsar/20 max-h-64 overflow-y-auto" data-testid="pool-content">
              {candidatePool.length === 0 ? (
                <p className="text-xs font-body text-nova/50 italic py-2">No other candidate tasks in backlog.</p>
              ) : (
                candidatePool.slice(0, 15).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-void/60 border border-pulsar/20 text-xs">
                    <span className="font-body text-starlight/90 truncate flex-1">{task.title}</span>
                    <span className="font-mono text-nova/60 shrink-0 ml-2">{task.estimated_minutes || 30}m</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Wins Accordion */}
        <div className="border border-pulsar/30 bg-void/40 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsQuickWinsOpen(prev => !prev)}
            className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left hover:bg-void/60 transition-colors"
            data-testid="toggle-quickwins-drawer"
          >
            <div className="flex items-center gap-2">
              {isQuickWinsOpen ? <ChevronDown className="w-4 h-4 text-nova/60" /> : <ChevronRight className="w-4 h-4 text-nova/60" />}
              <span className="text-base font-semibold font-display text-starlight">
                Quick Wins ({quickWins.length} micro-tasks &lt; 15m)
              </span>
            </div>
            <span className="text-xs font-mono text-nova/50 uppercase">Micro</span>
          </button>

          {isQuickWinsOpen && (
            <div className="p-4 pt-1 space-y-2 border-t border-pulsar/20 max-h-64 overflow-y-auto" data-testid="quickwins-content">
              {quickWins.length === 0 ? (
                <p className="text-xs font-body text-nova/50 italic py-2">No quick wins found in backlog.</p>
              ) : (
                quickWins.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-void/60 border border-pulsar/20 text-xs">
                    <span className="font-body text-starlight/90 truncate flex-1">{task.title}</span>
                    <span className="font-mono text-amber-400 shrink-0 ml-2">{task.estimated_minutes || 10}m</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. In-Place Swap Modal */}
      <SwapSlotModal
        isOpen={swapModalSlot !== null}
        onClose={() => setSwapModalSlot(null)}
        slotNumber={swapModalSlot}
        currentTaskId={currentSwappingSlot?.parentTask?.id || currentSwappingSlot?.plan?.task_id}
        candidates={candidatePool}
        onSelectCandidate={(newTaskId) => {
          if (swapModalSlot) {
            swapSlot(swapModalSlot, newTaskId);
          }
        }}
      />

      {/* 6. Undo Completion Toast (6-Second Auto-Expiry) */}
      {undoState && (
        <aside
          className="fixed bottom-6 right-6 z-50 bg-void/95 border-2 border-amber-500/70 text-starlight px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all duration-200"
          role="status"
          aria-live="polite"
          data-testid="undo-toast"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-body font-medium">Slot auto-completed</span>
          </div>
          <button
            type="button"
            onClick={undoLastAction}
            className="min-h-[44px] px-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-colors"
            data-testid="undo-button"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </aside>
      )}
    </section>
  );
}
