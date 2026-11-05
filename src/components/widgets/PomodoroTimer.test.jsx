// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PomodoroTimer from './PomodoroTimer';
import * as offlineApi from '../../lib/offlineApi';
import * as dayGuidePersistence from '../../lib/dayGuidePersistence';

const mockUser = { id: 'pomo-user-123' };
const mockAddXP = vi.fn().mockResolvedValue(true);
const mockToggleComplete = vi.fn();

const mockPrimaryTask = {
  id: 'task-pomo-primary',
  title: 'Research Autonomous Robotics',
  completed: false,
  estimated_minutes: 45,
  mental_load: 'high',
  quadrant: 'urgent_important',
  __type: 'matrix_task'
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    addXP: mockAddXP
  })
}));

vi.mock('../../hooks/useTodaysTasks', () => ({
  useTodaysTasks: () => ({
    tasks: [mockPrimaryTask],
    toggleComplete: mockToggleComplete
  })
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({})
    }),
    removeChannel: vi.fn()
  }
}));

vi.mock('../layout/Starfield', () => ({
  default: () => <div data-testid="starfield" />
}));

vi.mock('../../lib/offlineApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    offlineSelect: vi.fn(),
    offlineInsert: vi.fn(),
    offlineUpdate: vi.fn()
  };
});

describe('PomodoroTimer', () => {
  const todayStr = new Date().toLocaleDateString('en-CA');

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mocks
    offlineApi.offlineSelect.mockImplementation(async (table, query) => {
      if (table === 'daily_plan') {
        return {
          data: [
            {
              id: 'plan-robotics-999',
              user_id: mockUser.id,
              plan_date: todayStr,
              task_id: 'task-pomo-primary',
              slot: 1,
              target_boxes: 3,
              done_boxes: 0,
              status: 'planned'
            }
          ],
          error: null
        };
      }
      return { data: [], error: null };
    });

    offlineApi.offlineInsert.mockResolvedValue({ data: [{ id: 'new-row' }], error: null });
    offlineApi.offlineUpdate.mockResolvedValue({ data: [], error: null });

    // Mock Audio play
    window.Audio = vi.fn().mockImplementation(function () {
      return {
        play: vi.fn().mockResolvedValue(undefined),
        catch: vi.fn()
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates exactly one pomodoro_logs and one io_logs carrying plan_id on finish without triggering tally click writer', async () => {
    vi.useFakeTimers();

    const persistTimeboxSpy = vi.spyOn(dayGuidePersistence, 'persistTimeboxToggleDual');

    // Preload timer state with 1 second remaining
    localStorage.setItem(
      'polaris_pomodoro_state',
      JSON.stringify({
        mode: 'focus',
        isRunning: false,
        durations: { focus: 25, short: 5, long: 15 },
        timeLeft: 1
      })
    );

    render(<PomodoroTimer />);

    // Select primary task from dropdown
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'task-pomo-primary' } });

    // Start timer
    const startButton = screen.getAllByTitle('Start Timer')[0];
    fireEvent.click(startButton);

    // Advance 1.5 seconds so timer expires to 0
    await vi.advanceTimersByTimeAsync(1500);

    // Verify offlineInsert was called
    const pomoInsertCalls = offlineApi.offlineInsert.mock.calls.filter(c => c[0] === 'pomodoro_logs');
    const ioInsertCalls = offlineApi.offlineInsert.mock.calls.filter(c => c[0] === 'io_logs');

    // Exactly one pomodoro_logs row
    expect(pomoInsertCalls.length).toBe(1);
    expect(pomoInsertCalls[0][1]).toEqual(
      expect.objectContaining({
        user_id: mockUser.id,
        task_id: 'task-pomo-primary',
        plan_id: 'plan-robotics-999',
        date: todayStr
      })
    );

    // Exactly one io_logs row carrying plan_id and task type classified via classifyTaskType
    expect(ioInsertCalls.length).toBe(1);
    expect(ioInsertCalls[0][1]).toEqual(
      expect.objectContaining({
        user_id: mockUser.id,
        plan_id: 'plan-robotics-999',
        date: todayStr,
        type: 'input' // "Research Autonomous Robotics" matches research keyword
      })
    );

    // Does NOT trigger tally click writer
    expect(persistTimeboxSpy).not.toHaveBeenCalled();
  });

  it('respects explicit user ioType override over classifyTaskType', async () => {
    vi.useFakeTimers();

    localStorage.setItem(
      'polaris_pomodoro_state',
      JSON.stringify({
        mode: 'focus',
        isRunning: false,
        durations: { focus: 25, short: 5, long: 15 },
        timeLeft: 1
      })
    );

    render(<PomodoroTimer />);

    // Select primary task
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'task-pomo-primary' } });

    // Explicitly toggle to Output
    const outputButtons = screen.getAllByRole('button', { name: /Output/i });
    expect(outputButtons.length).toBeGreaterThan(0);
    fireEvent.click(outputButtons[0]);

    // Start timer
    const startButton = screen.getAllByTitle('Start Timer')[0];
    fireEvent.click(startButton);

    await vi.advanceTimersByTimeAsync(1500);

    const ioInsertCalls = offlineApi.offlineInsert.mock.calls.filter(c => c[0] === 'io_logs');
    expect(ioInsertCalls.length).toBe(1);
    expect(ioInsertCalls[0][1].type).toBe('output');
  });
});
