// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MatrixCanvasView, { computeActiveSubtask, isDueWithin48h } from './MatrixCanvasView';
import * as offlineApi from '../../lib/offlineApi';

const { mockUser } = vi.hoisted(() => ({
  mockUser: { id: 'test-user-123' }
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } } })
    }
  }
}));

vi.mock('../../lib/llm', () => ({
  getGroqKey: vi.fn().mockReturnValue('mock-key')
}));

vi.mock('../../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn(),
  offlineDelete: vi.fn()
}));

describe('MatrixCanvasView', () => {
  let dbTasks = [];
  let dbTemplates = [];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);

    dbTasks = [
      {
        id: 'task-1',
        user_id: mockUser.id,
        title: 'Deploy Polaris Alpha',
        status: 'active',
        quadrant: 'urgent_important',
        notes: 'Crucial release notes',
        estimated_minutes: 45,
        category: 'normal',
        deadline: '2026-09-30'
      },
      {
        id: 'task-2',
        user_id: mockUser.id,
        title: 'Review EE lecture slides',
        status: 'inbox',
        quadrant: null,
        notes: 'Chapter 4 semiconductors',
        estimated_minutes: 20,
        category: 'normal',
        deadline: null
      },
      {
        id: 'task-3',
        user_id: mockUser.id,
        title: 'Floating Node Idea',
        status: 'active',
        quadrant: 'important_not_urgent',
        canvas_x: 200,
        canvas_y: 150,
        notes: 'Floating note',
        estimated_minutes: 30,
        category: 'normal'
      },
      {
        id: 'task-4',
        user_id: mockUser.id,
        title: 'Completed Matrix Item',
        status: 'done',
        quadrant: 'urgent_important',
        notes: 'Already finished',
        estimated_minutes: 15
      }
    ];

    dbTemplates = [];

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') {
        return { data: JSON.parse(JSON.stringify(dbTasks)), error: null };
      }
      if (table === 'recurring_task_templates') {
        return { data: JSON.parse(JSON.stringify(dbTemplates)), error: null };
      }
      return { data: [], error: null };
    });

    offlineApi.offlineInsert.mockImplementation(async (table, row) => {
      const newRow = { ...row, id: row.id || `id-${Math.random()}` };
      if (table === 'tasks') {
        dbTasks.push(newRow);
      } else if (table === 'recurring_task_templates') {
        dbTemplates.push(newRow);
      }
      return { data: [newRow], error: null };
    });

    offlineApi.offlineUpdate.mockImplementation(async (table, match, data) => {
      if (table === 'tasks') {
        dbTasks = dbTasks.map(item => {
          let matches = true;
          for (const k in match) {
            if (item[k] !== match[k]) matches = false;
          }
          return matches ? { ...item, ...data } : item;
        });
        return { data: dbTasks, error: null };
      }
      if (table === 'recurring_task_templates') {
        dbTemplates = dbTemplates.map(item => {
          let matches = true;
          for (const k in match) {
            if (item[k] !== match[k]) matches = false;
          }
          return matches ? { ...item, ...data } : item;
        });
        return { data: dbTemplates, error: null };
      }
      return { data: [], error: null };
    });

    offlineApi.offlineDelete.mockImplementation(async (table, match) => {
      if (table === 'tasks') {
        dbTasks = dbTasks.filter(item => {
          for (const k in match) {
            if (item[k] === match[k]) return false;
          }
          return true;
        });
      }
      if (table === 'recurring_task_templates') {
        dbTemplates = dbTemplates.filter(item => {
          for (const k in match) {
            if (item[k] === match[k]) return false;
          }
          return true;
        });
      }
      return { data: [], error: null };
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders MatrixCanvasView with tasks on canvas and backlog', async () => {
    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
      expect(screen.getByText('Review EE lecture slides')).toBeDefined();
    });

    expect(screen.getByText('Floating Node Idea')).toBeDefined();
  });

  it('clicks a task card on the 2D quadrant canvas and opens details tab without crashing', async () => {
    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    const canvasTask = screen.getByText('Deploy Polaris Alpha');
    fireEvent.click(canvasTask);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
      expect(screen.getByDisplayValue('Crucial release notes')).toBeDefined();
    });
  });

  it('opens status dropdown inside details, selects a status, and calls update', async () => {
    const onTasksChanged = vi.fn();
    render(<MatrixCanvasView onTasksChanged={onTasksChanged} />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    // Select task to open details
    fireEvent.click(screen.getByText('Deploy Polaris Alpha'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
    });

    // Find and click the Status button to open dropdown
    const statusSection = screen.getByText('Status').closest('div');
    const statusButton = within(statusSection).getByRole('button');
    fireEvent.click(statusButton);

    // Click 'In Progress' in dropdown
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeDefined();
    });

    const inProgressOption = screen.getByRole('button', { name: /In Progress/i });
    fireEvent.click(inProgressOption);

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith('tasks', { id: 'task-1' }, { status: 'in_progress' });
    });
  });

  it('clicks a task in the backlog list and opens details without error', async () => {
    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Review EE lecture slides')).toBeDefined();
    });

    const backlogTask = screen.getByText('Review EE lecture slides');
    fireEvent.click(backlogTask);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Review EE lecture slides')).toBeDefined();
      expect(screen.getByDisplayValue('Chapter 4 semiconductors')).toBeDefined();
    });
  });

  it('tests editing title, notes, and quadrant in details tab', async () => {
    const onTasksChanged = vi.fn();
    render(<MatrixCanvasView onTasksChanged={onTasksChanged} />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    // Select task
    fireEvent.click(screen.getByText('Deploy Polaris Alpha'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
    });

    // Edit Title
    const titleInput = screen.getByDisplayValue('Deploy Polaris Alpha');
    fireEvent.change(titleInput, { target: { value: 'Deploy Polaris Beta' } });
    fireEvent.blur(titleInput);

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith('tasks', { id: 'task-1' }, { title: 'Deploy Polaris Beta' });
    });

    // Edit Notes
    const notesInput = screen.getByDisplayValue('Crucial release notes');
    fireEvent.change(notesInput, { target: { value: 'Updated release notes' } });
    fireEvent.blur(notesInput);

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith('tasks', { id: 'task-1' }, { notes: 'Updated release notes' });
    });

    // Edit Quadrant
    const quadSelect = screen.getByDisplayValue('Q1');
    fireEvent.change(quadSelect, { target: { value: 'important_not_urgent' } });

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith('tasks', { id: 'task-1' }, { quadrant: 'important_not_urgent' });
    });
  });

  it('deleting task resets selectedTaskId to null and switches back to backlog', async () => {
    const onTasksChanged = vi.fn();
    render(<MatrixCanvasView onTasksChanged={onTasksChanged} />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    // Select task
    fireEvent.click(screen.getByText('Deploy Polaris Alpha'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
    });

    // Click Delete Task button
    const deleteBtn = screen.getByRole('button', { name: /Delete Task/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('tasks', { id: 'task-1' });
    });

    // Details panel should now be reset and backlog tab should be active
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Deploy Polaris Alpha')).toBeNull();
      expect(screen.getByPlaceholderText('Dump thoughts here (Press Enter)...')).toBeDefined();
    });
  });

  it('resets statusDropdownOpen when switching tabs away from details', async () => {
    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    // Select task
    fireEvent.click(screen.getByText('Deploy Polaris Alpha'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
    });

    // Open dropdown
    const statusSection = screen.getByText('Status').closest('div');
    const statusButton = within(statusSection).getByRole('button');
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeDefined();
    });

    // Click Backlog tab
    const backlogTabBtn = screen.getByTitle(/Backlog/i);
    fireEvent.click(backlogTabBtn);

    // Switch back to details tab
    const detailsTabBtn = screen.getByTitle('Task Details');
    fireEvent.click(detailsTabBtn);

    // Dropdown options should be closed
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /In Progress/i })).toBeNull();
    });
  });

  it('renders suggestion chip when auto_quadrant_suggest is ON and moves task on click', async () => {
    localStorage.setItem('polaris_user_settings', JSON.stringify({
      featureFlags: { auto_quadrant_suggest: true }
    }));

    dbTasks.push({
      id: 'task-suggest-1',
      user_id: mockUser.id,
      title: 'High Load Strategic Research',
      status: 'active',
      quadrant: 'urgent_important', // Currently Q1
      mental_load: 'high', // Should be Q2 (important_not_urgent) since deadline is far
      deadline: '2026-10-15'
    });

    const onTasksChanged = vi.fn();
    render(<MatrixCanvasView onTasksChanged={onTasksChanged} />);

    await waitFor(() => {
      expect(screen.getByText('High Load Strategic Research')).toBeDefined();
    });

    // Suggestion chip should be rendered
    const taskCard = screen.getByText('High Load Strategic Research').closest('div');
    const moveBtn = within(taskCard).getByRole('button', { name: /Move back to Q2\?/i });
    expect(moveBtn).toBeDefined();

    // Click suggestion chip
    fireEvent.click(moveBtn);

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 'task-suggest-1' },
        { quadrant: 'important_not_urgent' }
      );
    });
  });

  it('does not show mental_load badge on 2D canvas pill, but shows it in Details drawer when selected', async () => {
    dbTasks.push({
      id: 'task-load-test',
      user_id: mockUser.id,
      title: 'Low Load Task Item',
      status: 'active',
      quadrant: 'urgent_important',
      mental_load: 'low'
    });

    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Low Load Task Item')).toBeDefined();
    });

    // On 2D canvas card pill, mental_load badge is NOT rendered
    expect(screen.queryByText('LOW')).toBeNull();

    // Select task to open details
    fireEvent.click(screen.getByText('Low Load Task Item'));

    await waitFor(() => {
      // In Details drawer, mental load badge is rendered
      expect(screen.getByText('LOW LOAD')).toBeDefined();
    });
  });

  it('consolidates duration markers on canvas card pill for task without subtasks vs with subtasks', async () => {
    dbTasks.push({
      id: 'parent-task-1',
      user_id: mockUser.id,
      title: 'CHAARG Documentation Sprint',
      status: 'active',
      quadrant: 'important_not_urgent',
      estimated_minutes: 120
    });
    dbTasks.push({
      id: 'child-task-1',
      user_id: mockUser.id,
      title: 'Take PCB photos',
      parent_task_id: 'parent-task-1',
      status: 'active',
      estimated_minutes: 30
    });

    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('CHAARG Documentation Sprint')).toBeDefined();
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    const chaargCard = screen.getByText('CHAARG Documentation Sprint').closest('.group');
    // Task without subtasks: renders estimate badge 45m
    expect(screen.getByText('45m')).toBeDefined();

    // Task with subtasks: does NOT render estimate badge 120m, but renders subtask count and remaining time
    expect(within(chaargCard).queryByText('120m')).toBeNull();
    expect(within(chaargCard).getByText(/0\/1/)).toBeDefined();
    expect(within(chaargCard).getByText(/~30 min left/)).toBeDefined();
  });

  it('renders subtle RefreshCw recurring indicator on canvas card pill when task has source_template_id', async () => {
    dbTasks.push({
      id: 'task-recurring-1',
      user_id: mockUser.id,
      title: 'Daily Code Review Routine',
      status: 'active',
      quadrant: 'urgent_important',
      source_template_id: 'tpl-1'
    });

    render(<MatrixCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Daily Code Review Routine')).toBeDefined();
    });

    const recurringIcon = screen.getByTitle('Recurring Task');
    expect(recurringIcon).toBeDefined();
  });

  it('toggles Repeat Daily switch in Details drawer to create recurring template and update task', async () => {
    const onTasksChanged = vi.fn();
    render(<MatrixCanvasView onTasksChanged={onTasksChanged} />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    // Select task to open details
    fireEvent.click(screen.getByText('Deploy Polaris Alpha'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
    });

    // Repeat daily switch should currently be unchecked
    const toggleSwitch = screen.getByRole('switch', { name: /Repeat Daily/i });
    expect(toggleSwitch.getAttribute('aria-checked')).toBe('false');

    // Click toggle to turn ON
    fireEvent.click(toggleSwitch);

    await waitFor(() => {
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'recurring_task_templates',
        expect.objectContaining({
          user_id: mockUser.id,
          title: 'Deploy Polaris Alpha',
          frequency: 'daily',
          is_active: true
        })
      );
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 'task-1' },
        expect.objectContaining({
          source_template_id: expect.any(String)
        })
      );
    });
  });

  it('toggles Repeat Daily switch OFF in Details drawer to deactivate existing recurring template', async () => {
    dbTemplates.push({
      id: 'tpl-active-1',
      user_id: mockUser.id,
      title: 'Deploy Polaris Alpha',
      is_active: true,
      frequency: 'daily'
    });
    dbTasks[0].source_template_id = 'tpl-active-1';

    const onTasksChanged = vi.fn();
    render(<MatrixCanvasView onTasksChanged={onTasksChanged} />);

    await waitFor(() => {
      expect(screen.getByText('Deploy Polaris Alpha')).toBeDefined();
    });

    // Select task
    fireEvent.click(screen.getByText('Deploy Polaris Alpha'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Deploy Polaris Alpha')).toBeDefined();
    });

    const toggleSwitch = screen.getByRole('switch', { name: /Repeat Daily/i });
    expect(toggleSwitch.getAttribute('aria-checked')).toBe('true');

    // Click toggle to turn OFF
    fireEvent.click(toggleSwitch);

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'recurring_task_templates',
        { id: 'tpl-active-1' },
        { is_active: false }
      );
    });
  });

  describe('computeActiveSubtask pure helper function', () => {
    it('Tier 1: selects subtask due within 48h with the lowest estimate', () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inTwoDays = new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inFiveDays = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const subtasks = [
        { id: 'sub-1', title: 'Due in 5 days', deadline: inFiveDays, estimated_minutes: 10 },
        { id: 'sub-2', title: 'Due tomorrow (40m)', deadline: tomorrow, estimated_minutes: 40 },
        { id: 'sub-3', title: 'Due in 2 days (15m)', deadline: inTwoDays, estimated_minutes: 15 },
        { id: 'sub-4', title: 'No deadline', deadline: null, estimated_minutes: 5 }
      ];

      const active = computeActiveSubtask(subtasks);
      expect(active.id).toBe('sub-3');
      expect(active.title).toBe('Due in 2 days (15m)');
    });

    it('Tier 2: surfaces in_progress or high priority subtask when none are near deadline', () => {
      const subtasks = [
        { id: 'sub-1', title: 'Active standard subtask', status: 'active', position: 0 },
        { id: 'sub-2', title: 'In progress subtask', status: 'in_progress', position: 1 },
        { id: 'sub-3', title: 'High priority subtask', priority: 'high', status: 'active', position: 2 }
      ];

      const active = computeActiveSubtask(subtasks);
      expect(active.id).toBe('sub-2');

      // If no in_progress but priority === 'high' exists
      const subtasks2 = [
        { id: 'sub-a', title: 'Regular subtask', status: 'active', position: 0 },
        { id: 'sub-b', title: 'High priority subtask', priority: 'high', status: 'active', position: 1 }
      ];
      const active2 = computeActiveSubtask(subtasks2);
      expect(active2.id).toBe('sub-b');
    });

    it('Tier 3: surfaces warm-up subtask (<=20m) when first subtask is >60m and high mental load', () => {
      const subtasksWithWarmup = [
        { id: 'sub-heavy', title: 'Write whole thesis chapter', position: 0, estimated_minutes: 90, mental_load: 'high' },
        { id: 'sub-warmup', title: 'Review 1 figure caption', position: 1, estimated_minutes: 15, mental_load: 'low' },
        { id: 'sub-other', title: 'Outline next section', position: 2, estimated_minutes: 30 }
      ];

      const active = computeActiveSubtask(subtasksWithWarmup);
      expect(active.id).toBe('sub-warmup');

      // If first subtask is NOT high mental load, surfaces first
      const subtasksNoHighLoad = [
        { id: 'sub-heavy-med', title: 'Code refactor', position: 0, estimated_minutes: 90, mental_load: 'medium' },
        { id: 'sub-warmup-2', title: 'Quick fix', position: 1, estimated_minutes: 15 }
      ];
      const active2 = computeActiveSubtask(subtasksNoHighLoad);
      expect(active2.id).toBe('sub-heavy-med');

      // If first subtask is <= 60m, surfaces first
      const subtasksShortHighLoad = [
        { id: 'sub-short-high', title: 'Math proof step', position: 0, estimated_minutes: 30, mental_load: 'high' },
        { id: 'sub-warmup-3', title: 'Format doc', position: 1, estimated_minutes: 10 }
      ];
      const active3 = computeActiveSubtask(subtasksShortHighLoad);
      expect(active3.id).toBe('sub-short-high');
    });
  });

  describe('Canvas focused next-action pill rendering and Details Drawer actions', () => {
    beforeEach(() => {
      localStorage.setItem('polaris_user_settings', JSON.stringify({
        featureFlags: { auto_quadrant_suggest: false }
      }));
    });

    it('expanding a parent task with multiple subtasks renders ONLY 1 active child pill and the queued count button on canvas', async () => {
      dbTasks.push({
        id: 'parent-task-expand',
        user_id: mockUser.id,
        title: 'Complete Research Paper Submission',
        status: 'active',
        quadrant: 'urgent_important'
      });
      dbTasks.push({
        id: 'sub-step-1',
        parent_task_id: 'parent-task-expand',
        user_id: mockUser.id,
        title: 'Draft Abstract and Introduction',
        status: 'active',
        position: 0,
        estimated_minutes: 25
      });
      dbTasks.push({
        id: 'sub-step-2',
        parent_task_id: 'parent-task-expand',
        user_id: mockUser.id,
        title: 'Export KiCAD Schematics',
        status: 'active',
        position: 1,
        estimated_minutes: 30
      });
      dbTasks.push({
        id: 'sub-step-3',
        parent_task_id: 'parent-task-expand',
        user_id: mockUser.id,
        title: 'Upload Final PDF',
        status: 'active',
        position: 2,
        estimated_minutes: 10
      });

      render(<MatrixCanvasView />);

      await waitFor(() => {
        expect(screen.getByText('Complete Research Paper Submission')).toBeDefined();
      });

      // Find expand button for this parent task
      const expandBtn = screen.getByTitle('Toggle Subtasks');
      fireEvent.click(expandBtn);

      await waitFor(() => {
        // ONLY active subtask step 1 should be rendered
        expect(screen.getByText('Draft Abstract and Introduction')).toBeDefined();
        // Step 2 and Step 3 must NOT be rendered as individual pills on canvas
        expect(screen.queryByText('Export KiCAD Schematics')).toBeNull();
        expect(screen.queryByText('Upload Final PDF')).toBeNull();
        // Compact queued pill should be rendered
        expect(screen.getByText('+ 2 queued in Project Drawer')).toBeDefined();
      });
    });

    it('marking the active subtask done immediately surfaces the next one on canvas', async () => {
      dbTasks.push({
        id: 'parent-task-flow',
        user_id: mockUser.id,
        title: 'Hardware Build Sprint',
        status: 'active',
        quadrant: 'urgent_important'
      });
      dbTasks.push({
        id: 'flow-sub-1',
        parent_task_id: 'parent-task-flow',
        user_id: mockUser.id,
        title: 'Solder Microcontroller Headers',
        status: 'active',
        position: 0,
        estimated_minutes: 15
      });
      dbTasks.push({
        id: 'flow-sub-2',
        parent_task_id: 'parent-task-flow',
        user_id: mockUser.id,
        title: 'Flash Firmware Image',
        status: 'active',
        position: 1,
        estimated_minutes: 20
      });

      render(<MatrixCanvasView />);

      await waitFor(() => {
        expect(screen.getByText('Hardware Build Sprint')).toBeDefined();
      });

      // Expand parent task
      fireEvent.click(screen.getByTitle('Toggle Subtasks'));

      await waitFor(() => {
        expect(screen.getByText('Solder Microcontroller Headers')).toBeDefined();
      });

      // Click Mark Done check button on the active child node pill
      const subtaskCard = screen.getByText('Solder Microcontroller Headers').closest('div');
      const markDoneBtn = within(subtaskCard).getByTitle('Mark Done');
      fireEvent.click(markDoneBtn);

      await waitFor(() => {
        expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
          'tasks',
          { id: 'flow-sub-1' },
          { status: 'done' }
        );
      });

      // The next subtask (Flash Firmware Image) is immediately promoted and rendered
      await waitFor(() => {
        expect(screen.getByText('Flash Firmware Image')).toBeDefined();
        expect(screen.queryByText('Solder Microcontroller Headers')).toBeNull();
      });
    });

    it('highlights active subtask and updates status to in_progress when clicking Set as Next Action in Details drawer', async () => {
      dbTasks.push({
        id: 'parent-task-drawer',
        user_id: mockUser.id,
        title: 'Firmware Architecture Overhaul',
        status: 'active',
        quadrant: 'urgent_important'
      });
      dbTasks.push({
        id: 'drawer-sub-1',
        parent_task_id: 'parent-task-drawer',
        user_id: mockUser.id,
        title: 'Write Bootloader Stubs',
        status: 'active',
        position: 0
      });
      dbTasks.push({
        id: 'drawer-sub-2',
        parent_task_id: 'parent-task-drawer',
        user_id: mockUser.id,
        title: 'Implement SPI DMA Driver',
        status: 'active',
        position: 1
      });

      render(<MatrixCanvasView />);

      await waitFor(() => {
        expect(screen.getByText('Firmware Architecture Overhaul')).toBeDefined();
      });

      // Click task to open Details drawer
      fireEvent.click(screen.getByText('Firmware Architecture Overhaul'));

      await waitFor(() => {
        expect(screen.getByText('Subtasks (0/2)')).toBeDefined();
        expect(screen.getByText('ACTIVE NEXT ACTION')).toBeDefined();
      });

      // Subtask 2 should have a 'Set as Next Action' button
      const setNextActionBtn = screen.getByRole('button', { name: /Set as Next Action/i });
      expect(setNextActionBtn).toBeDefined();

      // Click Set as Next Action on Subtask 2
      fireEvent.click(setNextActionBtn);

      await waitFor(() => {
        expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
          'tasks',
          { id: 'drawer-sub-2' },
          { status: 'in_progress' }
        );
      });
    });

    it('renders subtle urgent indicator when subtask is due within 48h', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dbTasks.push({
        id: 'parent-urgent-step',
        user_id: mockUser.id,
        title: 'Conference Presentation Prep',
        status: 'active',
        quadrant: 'important_not_urgent'
      });
      dbTasks.push({
        id: 'urgent-child-1',
        parent_task_id: 'parent-urgent-step',
        user_id: mockUser.id,
        title: 'Upload Presentation Slides',
        status: 'active',
        deadline: tomorrow
      });

      render(<MatrixCanvasView />);

      await waitFor(() => {
        expect(screen.getByText('Conference Presentation Prep')).toBeDefined();
        const parentCard = screen.getByText('Conference Presentation Prep').closest('div');
        expect(within(parentCard).getByTestId('urgent-subtask-indicator')).toBeDefined();
      });
    });

    it('renders Move back to Q2? chip when auto_quadrant_suggest is ON, task is in Q1 without urgent subtask and deadline is far away', async () => {
      localStorage.setItem('polaris_user_settings', JSON.stringify({
        featureFlags: { auto_quadrant_suggest: true }
      }));

      dbTasks.push({
        id: 'parent-demote-task',
        user_id: mockUser.id,
        title: 'Long Term Infrastructure Upgrade',
        status: 'active',
        quadrant: 'urgent_important', // Currently Q1
        deadline: '2026-10-30' // Far away
      });
      dbTasks.push({
        id: 'normal-child-1',
        parent_task_id: 'parent-demote-task',
        user_id: mockUser.id,
        title: 'Research Database Options',
        status: 'active',
        deadline: '2026-10-20' // Far away
      });

      render(<MatrixCanvasView />);

      await waitFor(() => {
        expect(screen.getByText('Long Term Infrastructure Upgrade')).toBeDefined();
      });

      // Suggestion chip to move back to Q2 should be present
      const taskCard = screen.getByText('Long Term Infrastructure Upgrade').closest('div');
      const moveBackBtn = within(taskCard).getByRole('button', { name: /Move back to Q2\?/i });
      expect(moveBackBtn).toBeDefined();

      // Click to confirm move back to Q2
      fireEvent.click(moveBackBtn);

      await waitFor(() => {
        expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
          'tasks',
          { id: 'parent-demote-task' },
          { quadrant: 'important_not_urgent' }
        );
      });
    });
  });
});
