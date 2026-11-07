// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PomodoroTimer from './PomodoroTimer';
import TimerTaskSearch from './TimerTaskSearch';
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
    cleanup();
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

  it('allows searching tasks in TimerTaskSearch and selecting via UI click', async () => {
    render(<PomodoroTimer />);

    const combobox = screen.getAllByRole('combobox')[0];
    fireEvent.focus(combobox);

    // Search for Robotics
    fireEvent.change(combobox, { target: { value: 'Robotics' } });

    const taskOption = screen.getByRole('option', { name: /Research Autonomous Robotics/i });
    expect(taskOption).toBeTruthy();

    fireEvent.click(taskOption);

    // Verify task banner is rendered with input IO classification
    expect(screen.getAllByText('Research Autonomous Robotics').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('📥 Input').length).toBeGreaterThanOrEqual(1);
  });

  it('allows setting a custom focus topic when searching with no matches', async () => {
    render(<PomodoroTimer />);

    const combobox = screen.getAllByRole('combobox')[0];
    fireEvent.change(combobox, { target: { value: 'Quantum Gravity' } });

    const customButton = screen.getByRole('button', { name: /Use 'Quantum Gravity' as focus topic/i });
    expect(customButton).toBeTruthy();

    fireEvent.click(customButton);

    // Verify comment input reflects custom topic
    const commentInput = screen.getByPlaceholderText("What's cookin?");
    expect(commentInput.value).toBe('Quantum Gravity');
  });
});

describe('TimerTaskSearch', () => {
  const sampleGroups = [
    {
      label: "🎯 Today's Curated",
      tasks: [
        { id: 'task-1', title: 'Refactor Authentication Flow', notes: 'Review JWT storage', quadrant: 'urgent_important', estimated_minutes: 45 },
        { id: 'task-2', title: 'Write Release Notes', notes: 'Include version 1.2', quadrant: 'important_not_urgent', estimated_minutes: 20 }
      ]
    },
    {
      label: "⚡ Urgent, Not Important (Q3)",
      tasks: [
        { id: 'task-3', title: 'Check server logs', notes: 'Check error rate', quadrant: 'urgent_not_important', estimated_minutes: 15 }
      ]
    }
  ];

  afterEach(() => {
    cleanup();
  });

  it('renders combobox and shows grouped tasks when dropdown is opened', () => {
    const onSelectTask = vi.fn();
    render(<TimerTaskSearch taskGroups={sampleGroups} selectedTaskId="" onSelectTask={onSelectTask} />);

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeTruthy();

    // Dropdown initially closed
    expect(screen.queryByRole('listbox')).toBeNull();

    // Click input to open dropdown
    fireEvent.focus(combobox);
    expect(screen.getByRole('listbox')).toBeTruthy();

    // Verify groups and task titles rendered
    expect(screen.getByText("🎯 Today's Curated")).toBeTruthy();
    expect(screen.getByText('Refactor Authentication Flow')).toBeTruthy();
    expect(screen.getByText('Write Release Notes')).toBeTruthy();
  });

  it('filters options in real-time when searching by keyword in title or notes', () => {
    const onSelectTask = vi.fn();
    render(<TimerTaskSearch taskGroups={sampleGroups} selectedTaskId="" onSelectTask={onSelectTask} />);

    const combobox = screen.getByRole('combobox');
    // Type query matching task 2 notes ("version")
    fireEvent.change(combobox, { target: { value: 'version' } });

    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByText('Write Release Notes')).toBeTruthy();
    expect(screen.queryByText('Refactor Authentication Flow')).toBeNull();
    expect(screen.queryByText('Check server logs')).toBeNull();
  });

  it('triggers onSelectTask when an option is clicked', () => {
    const onSelectTask = vi.fn();
    render(<TimerTaskSearch taskGroups={sampleGroups} selectedTaskId="" onSelectTask={onSelectTask} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.focus(combobox);

    const option = screen.getByText('Refactor Authentication Flow');
    fireEvent.click(option);

    expect(onSelectTask).toHaveBeenCalledWith('task-1');
  });

  it('shows fallback button and triggers onSetCustomTopic when query does not match any tasks', () => {
    const onSelectTask = vi.fn();
    const onSetCustomTopic = vi.fn();
    render(
      <TimerTaskSearch
        taskGroups={sampleGroups}
        selectedTaskId=""
        onSelectTask={onSelectTask}
        onSetCustomTopic={onSetCustomTopic}
      />
    );

    const combobox = screen.getByRole('combobox');
    fireEvent.change(combobox, { target: { value: 'Quantum Cryptography' } });

    expect(screen.getByText(/No tasks found matching/i)).toBeTruthy();
    const customButton = screen.getByRole('button', { name: /Use 'Quantum Cryptography' as focus topic/i });
    expect(customButton).toBeTruthy();

    fireEvent.click(customButton);
    expect(onSetCustomTopic).toHaveBeenCalledWith('Quantum Cryptography');
  });

  it('clears selection when clear button is clicked', () => {
    const onSelectTask = vi.fn();
    render(
      <TimerTaskSearch
        taskGroups={sampleGroups}
        selectedTaskId="task-1"
        onSelectTask={onSelectTask}
      />
    );

    const clearButton = screen.getByLabelText(/Clear task selection/i);
    fireEvent.click(clearButton);

    expect(onSelectTask).toHaveBeenCalledWith('');
  });

  it('supports keyboard navigation with ArrowDown, Enter, and Escape', () => {
    const onSelectTask = vi.fn();
    render(<TimerTaskSearch taskGroups={sampleGroups} selectedTaskId="" onSelectTask={onSelectTask} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.focus(combobox);

    // Arrow down moves to first task
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    // Press enter to select first task
    fireEvent.keyDown(combobox, { key: 'Enter' });
    expect(onSelectTask).toHaveBeenCalledWith('task-1');

    // Press Escape closes dropdown
    fireEvent.focus(combobox);
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
