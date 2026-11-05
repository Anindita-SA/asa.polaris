// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DayPlanBoard, { isNewBoardEnabled, setNewBoardEnabled, FF_NEW_BOARD } from './DayPlanBoard';
import SlotCard from './dayplan/SlotCard';
import TimeboxRow from './dayplan/TimeboxRow';
import SubtaskRow from './dayplan/SubtaskRow';
import RoutineDrawer from './dayplan/RoutineDrawer';
import SwapSlotModal from './dayplan/SwapSlotModal';
import * as offlineApi from '../../lib/offlineApi';

const mockUser = { id: 'user-c2-test' };
const mockAddXP = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    addXP: mockAddXP
  })
}));

vi.mock('../../lib/sound', () => ({
  playChime: vi.fn()
}));

vi.mock('../../lib/offlineApi', async () => {
  const actual = await vi.importActual('../../lib/offlineApi');
  return {
    ...actual,
    offlineSelect: vi.fn().mockImplementation(async (table) => {
      if (table === 'day_state') return { data: [{ energy_tier: 'Medium' }], error: null };
      if (table === 'habits') return { data: [{ id: 'h1', title: 'Morning meditation' }], error: null };
      if (table === 'habit_logs') return { data: [{ id: 'hl1', habit_id: 'h1', date: '2026-11-03' }], error: null };
      if (table === 'daily_tasks') return { data: [{ id: 'dt1', title: 'Drink water', completed: false }], error: null };
      return { data: [], error: null };
    }),
    offlineUpsert: vi.fn().mockImplementation(async (table, row) => ({ data: [row], error: null })),
    offlineInsert: vi.fn().mockImplementation(async (table, row) => ({ data: [row], error: null })),
    offlineUpdate: vi.fn().mockImplementation(async (table, match, data) => ({ data: [{ ...match, ...data }], error: null })),
    offlineDelete: vi.fn().mockImplementation(async (table, match) => ({ data: [match], error: null })),
    generateUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9)
  };
});

const mockUseDailyPlan = vi.fn();
vi.mock('../../hooks/useDailyPlan', () => ({
  useDailyPlan: (todayStr) => mockUseDailyPlan(todayStr)
}));

describe('Sprint C2: Day Plan Board UI Component Test Suite', () => {
  const todayStr = '2026-11-03';

  const defaultMockSlots = [
    {
      slot: 1,
      type: 'anchor',
      plan: { id: 'plan-1', slot: 1, target_boxes: 3, done_boxes: 1, manual_boxes: 1, status: 'planned', energy_tier: 'Medium' },
      parentTask: { id: 'parent-1', title: 'Design Hardware Power Converter', category: 'Hardware', status: 'in_progress' },
      items: [
        {
          item: { id: 'item-1', plan_id: 'plan-1', task_id: 'sub-1', position: 0, completed_by_slot: false },
          task: { id: 'sub-1', title: 'Derive switching equation', estimated_minutes: 30, estimate_source: 'heuristic', status: 'in_progress' }
        },
        {
          item: { id: 'item-2', plan_id: 'plan-1', task_id: 'sub-2', position: 1, completed_by_slot: false },
          task: { id: 'sub-2', title: 'Select MOSFETs', estimated_minutes: 15, status: 'in_progress' }
        }
      ],
      targetBoxes: 3,
      doneBoxes: 1,
      manualBoxes: 1,
      totalMinutes: 45,
      remainderMinutes: 0,
      isCleared: false,
      status: 'planned'
    },
    {
      slot: 2,
      type: 'support',
      plan: { id: 'plan-2', slot: 2, target_boxes: 2, done_boxes: 0, manual_boxes: 0, status: 'planned' },
      parentTask: { id: 'parent-2', title: 'Draft Recommendation Letter', category: 'Applications', status: 'in_progress' },
      items: [
        {
          item: { id: 'item-3', plan_id: 'plan-2', task_id: 'sub-3', position: 0, completed_by_slot: false },
          task: { id: 'sub-3', title: 'Write outline points', estimated_minutes: 20, status: 'in_progress' }
        }
      ],
      targetBoxes: 2,
      doneBoxes: 0,
      manualBoxes: 0,
      totalMinutes: 20,
      remainderMinutes: 5, // 20 % 15 = 5m remainder
      isCleared: false,
      status: 'planned'
    },
    {
      slot: 3,
      type: 'support',
      plan: { id: 'plan-3', slot: 3, target_boxes: 1, done_boxes: 1, manual_boxes: 1, status: 'cleared', auto_completed: true },
      parentTask: { id: 'parent-3', title: 'IELTS Practice Reading', category: 'Study', status: 'in_progress' },
      items: [],
      targetBoxes: 1,
      doneBoxes: 1,
      manualBoxes: 1,
      totalMinutes: 15,
      remainderMinutes: 0,
      isCleared: true,
      status: 'cleared'
    },
    {
      slot: 4,
      type: 'bonus',
      plan: { id: 'plan-4', slot: 4, target_boxes: 1, done_boxes: 0, manual_boxes: 0, status: 'planned' },
      parentTask: { id: 'parent-4', title: 'Organize Workbench', category: 'Upkeep', status: 'in_progress' },
      items: [],
      targetBoxes: 1,
      doneBoxes: 0,
      manualBoxes: 0,
      totalMinutes: 15,
      remainderMinutes: 0,
      isCleared: false,
      status: 'planned'
    }
  ];

  const defaultMockHookReturn = {
    todayStr,
    slots: defaultMockSlots,
    loading: false,
    undoState: null,
    tickBox: vi.fn(),
    untickBox: vi.fn(),
    toggleSubtask: vi.fn(),
    swapSlot: vi.fn(),
    recomputeSlotTarget: vi.fn(),
    undoLastAction: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseDailyPlan.mockReturnValue(defaultMockHookReturn);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Feature Flag Management', () => {
    it('defaults to false when localStorage is unset', () => {
      expect(isNewBoardEnabled()).toBe(false);
    });

    it('enables board when set to true or on', () => {
      setNewBoardEnabled(true);
      expect(localStorage.getItem(FF_NEW_BOARD)).toBe('true');
      expect(isNewBoardEnabled()).toBe(true);

      localStorage.setItem(FF_NEW_BOARD, 'on');
      expect(isNewBoardEnabled()).toBe(true);

      setNewBoardEnabled(false);
      expect(isNewBoardEnabled()).toBe(false);
    });
  });

  describe('Visual Hierarchy & Mobile-First 375px Discipline (Class & Target Checks)', () => {
    it('enforces 44px minimum tap target classes on interactive buttons, checkboxes, and chips', () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      // 1. Tally Box chips have min-h-[44px] min-w-[44px]
      const box0 = screen.getByTestId('timebox-chip-1-0');
      expect(box0.className).toContain('min-h-[44px]');
      expect(box0.className).toContain('min-w-[44px]');

      // 2. Subtask Checkbox has min-h-[44px] min-w-[44px]
      const subtaskCb = screen.getByTestId('subtask-checkbox-sub-1');
      expect(subtaskCb.className).toContain('min-h-[44px]');
      expect(subtaskCb.className).toContain('min-w-[44px]');

      // 3. Swap Slot Trigger has min-h-[44px] min-w-[44px]
      const swapBtn = screen.getByTestId('swap-slot-1');
      expect(swapBtn.className).toContain('min-h-[44px]');
      expect(swapBtn.className).toContain('min-w-[44px]');

      // 4. Energy tier pills have min-h-[44px]
      const medTierBtn = screen.getByTestId('energy-tier-medium');
      expect(medTierBtn.className).toContain('min-h-[44px]');

      // 5. Drawer toggles have min-h-[44px]
      const poolToggle = screen.getByTestId('toggle-pool-drawer');
      expect(poolToggle.className).toContain('min-h-[44px]');
    });

    it('enforces single-column container max-w-3xl and strict two heading sizes scale', () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      // Board container: single column max-w-3xl
      const board = screen.getByTestId('day-plan-board');
      expect(board.className).toContain('w-full');
      expect(board.className).toContain('max-w-3xl');

      // Card Title: text-base font-semibold font-display
      const title = screen.getByTestId('slot-title-1');
      expect(title.className).toContain('text-base');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('font-display');

      // Badges: text-xs font-mono uppercase
      const badge = screen.getByTestId('slot-badge-1');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('font-mono');
      expect(badge.className).toContain('uppercase');
    });

    it('contains zero CSS gradients across all rendered elements', () => {
      const { container } = render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      const allElements = container.querySelectorAll('*');
      allElements.forEach(el => {
        const cls = el.getAttribute('class') || '';
        expect(cls).not.toMatch(/bg-gradient/);
        expect(cls).not.toMatch(/from-/);
        expect(cls).not.toMatch(/via-/);
        expect(cls).not.toMatch(/to-/);
      });
    });
  });

  describe('Header Strip & Day Focus Progress Bar', () => {
    it('renders mode, date, energy tier pills, and calculates slot minutes progress', () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      expect(screen.getByText('Normal Mode')).toBeDefined();
      expect(screen.getByText(todayStr)).toBeDefined();

      // Energy tier selector pills
      expect(screen.getByTestId('energy-tier-low')).toBeDefined();
      expect(screen.getByTestId('energy-tier-medium')).toBeDefined();
      expect(screen.getByTestId('energy-tier-high')).toBeDefined();
      expect(screen.getByTestId('energy-tier-unwell')).toBeDefined();

      // Focus progress bar:
      // Slots 1..3: Slot 1 has 45m total (1 box done = 15m), Slot 2 has 20m total (0 done), Slot 3 has 15m total (1 box done = 15m)
      // Total planned = 45 + 20 + 15 = 80m. Total done = 15 + 0 + 15 = 30m. Pct = round(30 / 80 * 100) = 38%
      const label = screen.getByTestId('focus-progress-label');
      expect(label.textContent).toBe('30 / 80m (38%)');

      const bar = screen.getByTestId('focus-progress-bar');
      expect(bar.style.width).toBe('38%');
    });

    it('updates day_state when an energy tier pill is clicked', async () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      const highBtn = screen.getByTestId('energy-tier-high');
      await act(async () => {
        fireEvent.click(highBtn);
      });

      expect(offlineApi.offlineUpsert).toHaveBeenCalledWith(
        'day_state',
        expect.objectContaining({
          user_id: mockUser.id,
          day: todayStr,
          energy_tier: 'High',
          unwell: false
        })
      );
    });
  });

  describe('Card Display, Heuristic Marker, and Remainder Minutes', () => {
    it('renders Anchor Card prominently with ANCHOR badge, heuristic ~ marker, and remainder minutes', () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      // Slot 1 Anchor
      const anchorCard = screen.getByTestId('slot-card-1');
      expect(anchorCard.className).toContain('border-amber-500/50');
      expect(within(anchorCard).getByText('ANCHOR - PRIMARY FOCUS')).toBeDefined();
      expect(within(anchorCard).getByText('Design Hardware Power Converter')).toBeDefined();

      // Heuristic marker on sub-1: displays '~30m'
      const durTag = screen.getByTestId('subtask-duration-sub-1');
      expect(durTag.textContent).toBe('~30m');

      // Slot 2 Support has remainder minutes: 20m total across 2 boxes -> final box displays '5m'
      const slot2Card = screen.getByTestId('slot-card-2');
      expect(within(slot2Card).getByText('5m')).toBeDefined();

      // Slot 3 Cleared state
      const slot3Card = screen.getByTestId('slot-card-3');
      expect(within(slot3Card).getByText('Slot Cleared')).toBeDefined();

      // Slot 4 Bonus
      const slot4Card = screen.getByTestId('slot-card-4');
      expect(within(slot4Card).getByText('BONUS (OUTSIDE CAP)')).toBeDefined();
    });

    it('calls tickBox and untickBox when clicking timebox chips', async () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      // Slot 1: box 0 is filled (doneBoxes = 1). Box 1 is open.
      const box1 = screen.getByTestId('timebox-chip-1-1');
      await act(async () => {
        fireEvent.click(box1);
      });
      expect(defaultMockHookReturn.tickBox).toHaveBeenCalledWith(1);

      // Clicking box 0 (highest filled box) calls untickBox
      const box0 = screen.getByTestId('timebox-chip-1-0');
      await act(async () => {
        fireEvent.click(box0);
      });
      expect(defaultMockHookReturn.untickBox).toHaveBeenCalledWith(1);
    });

    it('calls toggleSubtask when clicking subtask checkbox', async () => {
      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      const subtaskCb = screen.getByTestId('subtask-checkbox-sub-1');
      await act(async () => {
        fireEvent.click(subtaskCb);
      });
      expect(defaultMockHookReturn.toggleSubtask).toHaveBeenCalledWith(1, 'sub-1');
    });
  });

  describe('Routine Drawer Component', () => {
    it('collapses by default and displays separate completion fraction (1/2 done)', async () => {
      await act(async () => {
        render(
          <RoutineDrawer
            userId={mockUser.id}
            todayStr={todayStr}
          />
        );
      });

      // Fraction: 1 habit done (hl1 exists), 1 daily task open = 1/2 done
      const fraction = screen.getByTestId('routine-fraction');
      expect(fraction.textContent).toBe('1/2 done');

      // Content collapsed initially
      expect(screen.queryByTestId('routine-content')).toBeNull();

      // Toggle drawer open
      const toggleBtn = screen.getByTestId('toggle-routine-drawer');
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      expect(screen.getByTestId('routine-content')).toBeDefined();
      expect(screen.getByText('Morning meditation')).toBeDefined();
      expect(screen.getByText('Drink water')).toBeDefined();
    });

    it('toggles daily tasks with 44px tap target', async () => {
      await act(async () => {
        render(
          <RoutineDrawer
            userId={mockUser.id}
            todayStr={todayStr}
          />
        );
      });

      const toggleBtn = screen.getByTestId('toggle-routine-drawer');
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      const dtCb = screen.getByTestId('daily-task-toggle-dt1');
      expect(dtCb.className).toContain('min-h-[44px]');
      expect(dtCb.className).toContain('min-w-[44px]');

      await act(async () => {
        fireEvent.click(dtCb);
      });

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_tasks',
        { id: 'dt1', user_id: mockUser.id },
        expect.objectContaining({ completed: true })
      );
    });
  });

  describe('Swap Slot Modal Component', () => {
    it('opens modal, renders eligible candidate parent tasks, and invokes swapSlot', async () => {
      const candidates = [
        { id: 'parent-backlog-1', title: 'Write Thesis Proposal', estimated_minutes: 60, quadrant: 'urgent_important' }
      ];

      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={candidates}
        />
      );

      // Open swap modal for Slot 1
      const swapBtn = screen.getByTestId('swap-slot-1');
      await act(async () => {
        fireEvent.click(swapBtn);
      });

      expect(screen.getByTestId('swap-slot-modal')).toBeDefined();
      expect(screen.getByText('Swap Slot 1')).toBeDefined();
      expect(screen.getByText('Write Thesis Proposal')).toBeDefined();

      // Click candidate
      const candBtn = screen.getByTestId('swap-candidate-parent-backlog-1');
      expect(candBtn.className).toContain('min-h-[44px]');

      await act(async () => {
        fireEvent.click(candBtn);
      });

      expect(defaultMockHookReturn.swapSlot).toHaveBeenCalledWith(1, 'parent-backlog-1');
      // Modal closes
      expect(screen.queryByTestId('swap-slot-modal')).toBeNull();
    });
  });

  describe('Undo Toast Floating Component', () => {
    it('renders undo toast with 44px tap target and invokes undoLastAction when clicked', async () => {
      mockUseDailyPlan.mockReturnValue({
        ...defaultMockHookReturn,
        undoState: { planId: 'plan-1', slotNumber: 1 }
      });

      render(
        <DayPlanBoard
          todayStr={todayStr}
          allBacklogTasks={[]}
        />
      );

      const toast = screen.getByTestId('undo-toast');
      expect(toast).toBeDefined();
      expect(screen.getByText('Slot auto-completed')).toBeDefined();

      const undoBtn = screen.getByTestId('undo-button');
      expect(undoBtn.className).toContain('min-h-[44px]');

      await act(async () => {
        fireEvent.click(undoBtn);
      });

      expect(defaultMockHookReturn.undoLastAction).toHaveBeenCalled();
    });
  });
});
