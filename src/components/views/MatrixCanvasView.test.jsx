// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MatrixCanvasView from './MatrixCanvasView';
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

  beforeEach(() => {
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

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') {
        return { data: JSON.parse(JSON.stringify(dbTasks)), error: null };
      }
      return { data: [], error: null };
    });

    offlineApi.offlineInsert.mockImplementation(async (table, row) => {
      const newRow = { ...row, id: row.id || `id-${Math.random()}` };
      dbTasks.push(newRow);
      return { data: [newRow], error: null };
    });

    offlineApi.offlineUpdate.mockImplementation(async (table, match, data) => {
      dbTasks = dbTasks.map(item => {
        let matches = true;
        for (const k in match) {
          if (item[k] !== match[k]) matches = false;
        }
        return matches ? { ...item, ...data } : item;
      });
      return { data: dbTasks, error: null };
    });

    offlineApi.offlineDelete.mockImplementation(async (table, match) => {
      dbTasks = dbTasks.filter(item => {
        for (const k in match) {
          if (item[k] === match[k]) return false;
        }
        return true;
      });
      return { data: [], error: null };
    });
  });

  afterEach(() => {
    cleanup();
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
});
