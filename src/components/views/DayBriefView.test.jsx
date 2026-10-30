// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DayBriefView from './DayBriefView';
import * as offlineApi from '../../lib/offlineApi';

const mockUser = { id: 'test-user-123' };
let mockTasksLoading = false;
let mockTasks = [];
let mockAllBacklogTasks = [];
let passedWidgetProps = null;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

vi.mock('../../hooks/useTodaysTasks', () => ({
  useTodaysTasks: () => ({
    tasks: mockTasks,
    allBacklogTasks: mockAllBacklogTasks,
    isLoading: mockTasksLoading,
    toggleComplete: vi.fn(),
    addTask: vi.fn(),
    addSubtask: vi.fn(),
    attachSubtask: vi.fn(),
    updateSortOrder: vi.fn()
  })
}));

vi.mock('../../hooks/useMorningBrief', () => ({
  useMorningBrief: () => ({
    generateBrief: vi.fn(),
    isGenerating: false
  })
}));

vi.mock('../../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn()
}));

vi.mock('../widgets/TodayAgendaWidget', () => ({
  default: (props) => {
    passedWidgetProps = props;
    return <div data-testid="today-agenda-widget">Agenda Widget ({props.tasks?.length || 0} tasks)</div>;
  }
}));

describe('DayBriefView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    passedWidgetProps = null;
    mockTasksLoading = false;
    mockTasks = [
      { id: 'task-1', title: 'Task 1', completed: false, quadrant: 'urgent_important' }
    ];
    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'morning_briefs') {
        return {
          data: [
            {
              id: 'brief-1',
              items: [
                { type: 'news', title: 'Tech Innovation', summary: 'Exciting news summary' }
              ]
            }
          ]
        };
      }
      if (table === 'goals') return { data: [{ title: 'Weekly Goal 1', scope: 'weekly', completed: false }] };
      if (table === 'hardware_opportunities') return { data: [] };
      if (table === 'media_log') return { data: [] };
      return { data: [] };
    });
  });

  it('renders brief and TodayAgendaWidget with props, without unmounting when background tasksLoading is true', async () => {
    // 1. Initial render with loaded brief and tasksLoading = false
    mockTasksLoading = false;
    const { rerender } = render(<DayBriefView />);

    await waitFor(() => {
      expect(screen.getByText('Day Brief')).toBeDefined();
      expect(screen.getByTestId('today-agenda-widget')).toBeDefined();
    });

    // Verify TodayAgendaWidget received props
    expect(passedWidgetProps).toBeDefined();
    expect(passedWidgetProps.tasks).toEqual(mockTasks);
    expect(passedWidgetProps.isLoading).toBe(false);

    // 2. Simulate background task update where tasksLoading flips to true
    mockTasksLoading = true;
    rerender(<DayBriefView />);

    // Must NOT unmount or show "Loading your brief..." placeholder
    expect(screen.queryByText('Loading your brief...')).toBeNull();
    expect(screen.getByText('Day Brief')).toBeDefined();
    expect(screen.getByTestId('today-agenda-widget')).toBeDefined();
  });

  it('shows loading placeholder only on cold initial load when brief items are empty', async () => {
    // Mock cold load with pending promise
    offlineApi.offlineSelect.mockImplementation(() => new Promise(() => {}));

    render(<DayBriefView />);

    expect(screen.getByText('Loading your brief...')).toBeDefined();
  });
});
