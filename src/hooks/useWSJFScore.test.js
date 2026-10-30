// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  computeWSJFScore, 
  calculateDeadlineUrgency, 
  calculateDurationScore,
  useWSJFScore
} from './useWSJFScore';
import { offlineSelect } from '../lib/offlineApi';

const mockUser = { id: 'test-user-123' };

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('../lib/offlineApi', () => ({
  offlineSelect: vi.fn()
}));

describe('WSJF Scoring Math', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates deadline urgency correctly', () => {
    // Overdue: stays 4 for 0-3 days, drops to 2 for >3 days
    expect(calculateDeadlineUrgency('2026-08-26')).toBe(4); // today (0 days)
    expect(calculateDeadlineUrgency('2026-08-25')).toBe(4); // 1 day overdue
    expect(calculateDeadlineUrgency('2026-08-23')).toBe(4); // 3 days overdue
    expect(calculateDeadlineUrgency('2026-08-22')).toBe(2); // 4 days overdue (>3 days)
    
    // < 3 days away (27, 28)
    expect(calculateDeadlineUrgency('2026-08-27')).toBe(3);
    
    // 3-7 days away (29, 30, 31, 01, 02)
    expect(calculateDeadlineUrgency('2026-08-29')).toBe(2);
    expect(calculateDeadlineUrgency('2026-09-02')).toBe(2);
    
    // > 7 days away
    expect(calculateDeadlineUrgency('2026-09-03')).toBe(1);
    
    // No deadline
    expect(calculateDeadlineUrgency(null)).toBe(0);
  });

  it('marks tasks stale when overdue by more than 3 days', () => {
    const freshTask = {
      quadrant: 'urgent_important',
      deadline: '2026-08-24', // 2 days overdue
      estimated_minutes: 30
    };
    const staleTask = {
      quadrant: 'urgent_important',
      deadline: '2026-08-22', // 4 days overdue
      estimated_minutes: 30
    };

    const freshResult = computeWSJFScore(freshTask);
    expect(freshResult.isStale).toBe(false);
    expect(freshResult.breakdown.deadlineUrgency).toBe(4);

    const staleResult = computeWSJFScore(staleTask);
    expect(staleResult.isStale).toBe(true);
    expect(staleResult.breakdown.deadlineUrgency).toBe(2);
  });

  it('calculates duration score correctly', () => {
    // Max 4 for <= 15 mins
    expect(calculateDurationScore(15)).toBe(4);
    // 30 mins = 0.5 hours -> 1 / 0.5 = 2
    expect(calculateDurationScore(30)).toBe(2);
    // 60 mins = 1 hour -> 1 / 1 = 1
    expect(calculateDurationScore(60)).toBe(1);
    // Missing duration -> neutral 1
    expect(calculateDurationScore(null)).toBe(1);
    expect(calculateDurationScore(0)).toBe(1);
  });

  it('computes total WSJF score correctly', () => {
    const task = {
      quadrant: 'urgent_important', // weight 4
      deadline: '2026-08-26',       // urgency 4
      estimated_minutes: 15         // duration 4
    };
    
    // Score = (4 * 0.4) + (4 * 0.35) + (4 * 0.25) = 1.6 + 1.4 + 1.0 = 4.0
    const result = computeWSJFScore(task);
    expect(result.score).toBe(4.0);
    expect(result.breakdown.quadrantWeight).toBe(4);
    expect(result.breakdown.deadlineUrgency).toBe(4);
    expect(result.breakdown.durationScore).toBe(4);
  });

  it('computes scores for unestimated backburner tasks', () => {
    const task = {
      quadrant: 'neither', // weight 1
      deadline: null,      // urgency 0
      estimated_minutes: null // duration 1
    };
    
    // Score = (1 * 0.4) + (0 * 0.35) + (1 * 0.25) = 0.4 + 0 + 0.25 = 0.65
    const result = computeWSJFScore(task);
    expect(result.score).toBe(0.65);
  });
});

describe('useWSJFScore hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes archived tasks and tasks with completed milestones', async () => {
    const mockTasks = [
      { id: 'task-active', title: 'Active Task', status: 'active', quadrant: 'urgent_important', user_id: 'test-user-123' },
      { id: 'task-archived', title: 'Ghost Task', status: 'archived', quadrant: 'urgent_important', user_id: 'test-user-123' },
      { id: 'task-done', title: 'Done Task', status: 'done', quadrant: 'urgent_important', user_id: 'test-user-123' },
      { id: 'task-with-done-ms', title: 'Stale Milestone Task', status: 'active', quadrant: 'urgent_important', milestone_id: 'ms-done', user_id: 'test-user-123' },
      { id: 'task-with-active-ms', title: 'Live Milestone Task', status: 'active', quadrant: 'urgent_important', milestone_id: 'ms-active', user_id: 'test-user-123' }
    ];

    const mockMilestones = [
      { id: 'ms-done', title: 'Past Exam', status: 'done', user_id: 'test-user-123' },
      { id: 'ms-active', title: 'Future Milestone', status: 'in_progress', user_id: 'test-user-123' }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') return { data: mockTasks, error: null };
      if (table === 'milestones') return { data: mockMilestones, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useWSJFScore());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const taskIds = result.current.tasks.map(t => t.id);
    expect(taskIds).toContain('task-active');
    expect(taskIds).toContain('task-with-active-ms');
    expect(taskIds).not.toContain('task-archived');
    expect(taskIds).not.toContain('task-done');
    expect(taskIds).not.toContain('task-with-done-ms');
  });
});
