// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeDeterministicScore,
  filterEligibleCandidates,
  recomputeTargetBoxes,
  allocateSlots,
  selectSubtasksForSlot,
  createDailyPlanIfMissing,
  executeSprintCCutover
} from './dayPlanCreator';
import * as offlineApi from './offlineApi';
import db from './offlineStore';

vi.mock('./offlineApi', async () => {
  const actual = await vi.importActual('./offlineApi');
  return {
    ...actual,
    offlineSelect: vi.fn(),
    offlineInsert: vi.fn().mockImplementation(async (table, row) => ({ data: [row], error: null })),
    offlineUpdate: vi.fn().mockImplementation(async (table, match, data) => ({ data: [{ ...match, ...data }], error: null })),
    offlineDelete: vi.fn().mockImplementation(async (table, match) => ({ data: [match], error: null })),
    generateUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9)
  };
});

describe('dayPlanCreator (Sprint C1 Foundations & Engine)', () => {
  const todayStr = '2026-11-03';
  const userId = 'user-test-c1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Deterministic Scorer (Score = Value + Urgency + RolloverBonus, No Size Division)', () => {
    it('calculates score based on quadrant value and normal deadline', () => {
      // urgent_important = 4, deadline in 5 days (this week) = 2, rollover = 0
      const task = {
        id: 't1',
        title: 'Complete thesis draft',
        quadrant: 'urgent_important',
        deadline: '2026-11-08'
      };
      const result = computeDeterministicScore(task, todayStr);
      expect(result.value).toBe(4);
      expect(result.urgency).toBe(2);
      expect(result.rolloverBonus).toBe(0);
      expect(result.score).toBe(6);
    });

    it('gives Urgency = 4 for tasks overdue by 0 to 3 days', () => {
      const task = {
        id: 't2',
        title: 'Review PR',
        quadrant: 'important_not_urgent', // 3
        deadline: '2026-11-02' // 1 day overdue
      };
      const result = computeDeterministicScore(task, todayStr);
      expect(result.urgency).toBe(4);
      expect(result.isStale).toBe(false);
      expect(result.score).toBe(7); // 3 + 4 + 0
    });

    it('decays Urgency down to 2 and marks isStale for tasks overdue > 3 days', () => {
      const task = {
        id: 't3',
        title: 'Old backlog item',
        quadrant: 'urgent_important', // 4
        deadline: '2026-10-25' // > 3 days overdue
      };
      const result = computeDeterministicScore(task, todayStr);
      expect(result.urgency).toBe(2);
      expect(result.isStale).toBe(true);
      expect(result.score).toBe(6); // 4 + 2 + 0
    });

    it('gives Urgency = 3 and marks isWithin48h for deadlines within 48 hours', () => {
      const task = {
        id: 't4',
        title: 'Submit scholarship report',
        quadrant: 'urgent_important', // 4
        deadline: '2026-11-04' // 1 day ahead (within 48h)
      };
      const result = computeDeterministicScore(task, todayStr);
      expect(result.urgency).toBe(3);
      expect(result.isWithin48h).toBe(true);
      expect(result.score).toBe(7);
    });

    it('adds rollover bonus capped at 1.0 (0.2 * days_rolled_over)', () => {
      const task = {
        id: 't5',
        title: 'Rolled task',
        quadrant: 'neither', // 1
        days_rolled_over: 3 // 0.2 * 3 = 0.6
      };
      const result = computeDeterministicScore(task, todayStr);
      expect(result.rolloverBonus).toBe(0.6);
      expect(result.score).toBe(2.6); // 1 (value) + 1 (no deadline urgency) + 0.6

      const taskHeavyRollover = {
        id: 't6',
        title: 'Heavily rolled task',
        quadrant: 'neither', // 1
        rollover_count: 8 // 0.2 * 8 = 1.6 -> capped at 1.0
      };
      const resultHeavy = computeDeterministicScore(taskHeavyRollover, todayStr);
      expect(resultHeavy.rolloverBonus).toBe(1.0);
      expect(resultHeavy.score).toBe(3.0);
    });

    it('never divides by duration or size in scoring', () => {
      const shortTask = {
        id: 't-short',
        title: 'Quick 15 min check',
        quadrant: 'urgent_important',
        estimated_minutes: 15
      };
      const longTask = {
        id: 't-long',
        title: 'Long 180 min deep work',
        quadrant: 'urgent_important',
        estimated_minutes: 180
      };

      const scoreShort = computeDeterministicScore(shortTask, todayStr).score;
      const scoreLong = computeDeterministicScore(longTask, todayStr).score;
      // Size does not alter the score denominator
      expect(scoreShort).toBe(scoreLong);
    });
  });

  describe('Candidate Filtering (Parents Only, Never Leaf Subtasks)', () => {
    it('strictly excludes leaf subtasks with parent_task_id !== null', () => {
      const tasks = [
        { id: 'p1', title: 'Parent Task 1', parent_task_id: null, status: 'in_progress' },
        { id: 'c1', title: 'Child Subtask 1', parent_task_id: 'p1', status: 'in_progress' },
        { id: 's1', title: 'Standalone Task', parent_task_id: null, status: 'todo' }
      ];

      const candidates = filterEligibleCandidates(tasks);
      expect(candidates.map(c => c.id)).toEqual(['p1', 's1']);
      expect(candidates.some(c => c.id === 'c1')).toBe(false);
    });

    it('excludes completed tasks, archived tasks, and completed milestone tasks', () => {
      const milestones = [
        { id: 'm-done', status: 'done' },
        { id: 'm-open', status: 'in_progress' }
      ];

      const tasks = [
        { id: 't-done', title: 'Done task', status: 'done', parent_task_id: null },
        { id: 't-archived', title: 'Archived task', archived: true, parent_task_id: null },
        { id: 't-milestone-done', title: 'Task in done milestone', milestone_id: 'm-done', parent_task_id: null },
        { id: 't-valid', title: 'Valid task', milestone_id: 'm-open', status: 'in_progress', parent_task_id: null }
      ];

      const candidates = filterEligibleCandidates(tasks, milestones);
      expect(candidates.map(c => c.id)).toEqual(['t-valid']);
    });
  });

  describe('Slot Allocation Rules', () => {
    it('assigns Anchor to highest scoring candidate with >= 60 open minutes', () => {
      const candidates = [
        { id: 'c-high-small', title: 'Quick urgent fix', quadrant: 'urgent_important', deadline: '2026-11-04' }, // score 7, 20m
        { id: 'c-med-large', title: 'Large system design', quadrant: 'important_not_urgent', deadline: '2026-11-08' }, // score 5, 120m
        { id: 'c-support', title: 'Support item', quadrant: 'neither' } // score 2, 30m
      ];

      const openSubtasksByParentId = {
        'c-high-small': [{ id: 'st1', title: 'Fix CSS', estimated_minutes: 20 }],
        'c-med-large': [
          { id: 'st2', title: 'Write architecture', estimated_minutes: 60 },
          { id: 'st3', title: 'Design schematics', estimated_minutes: 60 }
        ],
        'c-support': [{ id: 'st4', title: 'Organize files', estimated_minutes: 30 }]
      };

      const allocations = allocateSlots(candidates, openSubtasksByParentId, todayStr);
      expect(allocations[0].slot).toBe(1);
      expect(allocations[0].type).toBe('anchor');
      // Anchor must be c-med-large because it has >= 60m open work, despite c-high-small having higher score
      expect(allocations[0].item.candidate.id).toBe('c-med-large');
    });

    it('falls back to top scorer overall if no candidate has >= 60 open minutes', () => {
      const candidates = [
        { id: 'c1', title: 'Task 1', quadrant: 'urgent_important', deadline: '2026-11-04' }, // score 7
        { id: 'c2', title: 'Task 2', quadrant: 'important_not_urgent' } // score 4
      ];

      const openSubtasksByParentId = {
        'c1': [{ id: 'st1', title: 'Quick check', estimated_minutes: 15 }],
        'c2': [{ id: 'st2', title: 'Another check', estimated_minutes: 15 }]
      };

      const allocations = allocateSlots(candidates, openSubtasksByParentId, todayStr);
      expect(allocations[0].slot).toBe(1);
      expect(allocations[0].item.candidate.id).toBe('c1');
    });

    it('prioritizes tasks with deadlines <= 48h for Support slots', () => {
      const candidates = [
        { id: 'c-anchor', title: 'Anchor Task', quadrant: 'urgent_important', estimated_minutes: 90 }, // Anchor
        { id: 'c-far-high', title: 'High score far deadline', quadrant: 'urgent_important', deadline: '2026-11-20', estimated_minutes: 30 }, // score 5
        { id: 'c-near-med', title: 'Med score near deadline', quadrant: 'important_not_urgent', deadline: '2026-11-04', estimated_minutes: 30 }, // score 6 (within 48h)
        { id: 'c-bonus', title: 'Bonus Task', quadrant: 'neither', estimated_minutes: 30 }
      ];

      const allocations = allocateSlots(candidates, {}, todayStr);
      expect(allocations[0].slot).toBe(1);
      expect(allocations[0].item.candidate.id).toBe('c-anchor');

      // Support 1 (slot 2) should pick near deadline task
      expect(allocations[1].slot).toBe(2);
      expect(allocations[1].item.candidate.id).toBe('c-near-med');

      // Support 2 (slot 3)
      expect(allocations[2].slot).toBe(3);
      expect(allocations[2].item.candidate.id).toBe('c-far-high');

      // Bonus (slot 4)
      expect(allocations[3].slot).toBe(4);
      expect(allocations[3].item.candidate.id).toBe('c-bonus');
    });
  });

  describe('Subtask Selection & Creation-Time Heuristic Pre-fill', () => {
    it('orders subtasks strictly by position ASC, then created_at ASC, id ASC', async () => {
      const parentTask = { id: 'p1', title: 'Parent task' };
      const subtasks = [
        { id: 's3', position: 3, estimated_minutes: 15, title: 'Step 3' },
        { id: 's1', position: 1, estimated_minutes: 15, title: 'Step 1' },
        { id: 's2', position: 2, estimated_minutes: 15, title: 'Step 2' }
      ];

      const { chosenSubtasks } = await selectSubtasksForSlot(parentTask, subtasks, 'support');
      expect(chosenSubtasks.map(s => s.id)).toEqual(['s1', 's2']); // 15 + 15 = 30m fills support cap
    });

    it('pre-fills heuristic duration at creation time when estimate is missing and flags estimate_source', async () => {
      const parentTask = { id: 'p1', title: 'Parent task' };
      const subtasks = [
        { id: 's-unestimated', position: 1, title: 'Code simulation engine', estimated_minutes: null, time_estimate_minutes: null }
      ];

      const { chosenSubtasks } = await selectSubtasksForSlot(parentTask, subtasks, 'support');
      expect(chosenSubtasks.length).toBe(1);
      const chosen = chosenSubtasks[0];

      // 'Code...' keywords trigger high load 45m heuristic
      expect(chosen.estimated_minutes).toBe(45);
      expect(chosen.estimate_source).toBe('heuristic');

      // Verify offlineUpdate was called to persist heuristic to Dexie and sync queue
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 's-unestimated' },
        expect.objectContaining({
          estimated_minutes: 45,
          time_estimate_minutes: 45,
          estimate_source: 'heuristic'
        })
      );
    });

    it('guarantees at least 1 subtask is selected even if its duration exceeds slot cap', async () => {
      const parentTask = { id: 'p1', title: 'Parent task' };
      const subtasks = [
        { id: 's-large', position: 1, title: 'Large subtask', estimated_minutes: 60 }
      ];

      const { chosenSubtasks, targetBoxes } = await selectSubtasksForSlot(parentTask, subtasks, 'support'); // cap is 30m
      expect(chosenSubtasks.length).toBe(1);
      expect(targetBoxes).toBe(4); // ceil(60 / 15) = 4
    });
  });

  describe('Target Boxes & Remainder Calculation', () => {
    it('calculates target_boxes as ceil(minutes / 15) with minimum 1', () => {
      expect(recomputeTargetBoxes([{ estimated_minutes: 45 }], null)).toBe(3);
      expect(recomputeTargetBoxes([{ estimated_minutes: 50 }], null)).toBe(4);
      expect(recomputeTargetBoxes([{ estimated_minutes: 10 }], null)).toBe(1);
      expect(recomputeTargetBoxes([], { estimated_minutes: 30 })).toBe(2);
      expect(recomputeTargetBoxes([], { estimated_minutes: 5 })).toBe(1);
    });
  });

  describe('createDailyPlanIfMissing Idempotency', () => {
    it('returns existing rows without inserting when plans already exist for today', async () => {
      const mockExisting = [
        { id: 'plan-1', user_id: userId, plan_date: todayStr, slot: 1 }
      ];

      // Mock Dexie daily_plan.where().toArray()
      const origDailyPlan = db.daily_plan;
      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockExisting)
          }),
          toArray: vi.fn().mockResolvedValue(mockExisting)
        })
      };

      const result = await createDailyPlanIfMissing({ userId, todayStr });
      expect(result).toEqual(mockExisting);
      expect(offlineApi.offlineInsert).not.toHaveBeenCalled();

      db.daily_plan = origDailyPlan;
    });

    it('creates new parent-level slots and daily_plan_items when 0 plans exist', async () => {
      const origDailyPlan = db.daily_plan;
      const origTasks = db.tasks;
      const origMilestones = db.milestones;

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([])
          }),
          toArray: vi.fn().mockResolvedValue([])
        })
      };

      const mockTasks = [
        { id: 'parent-1', user_id: userId, title: 'Anchor Parent', quadrant: 'urgent_important', parent_task_id: null },
        { id: 'sub-1', user_id: userId, parent_task_id: 'parent-1', title: 'Subtask 1', estimated_minutes: 60, position: 1 },
        { id: 'parent-2', user_id: userId, title: 'Support Parent', quadrant: 'important_not_urgent', parent_task_id: null },
        { id: 'sub-2', user_id: userId, parent_task_id: 'parent-2', title: 'Subtask 2', estimated_minutes: 30, position: 1 }
      ];

      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockTasks)
          })
        })
      };

      db.milestones = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([])
          })
        })
      };

      const created = await createDailyPlanIfMissing({ userId, todayStr });
      expect(created.length).toBe(2);
      expect(created[0].slot).toBe(1);
      expect(created[0].task_id).toBe('parent-1');
      expect(created[1].slot).toBe(2);
      expect(created[1].task_id).toBe('parent-2');

      // Verify daily_plan_items inserted
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'daily_plan_items',
        expect.objectContaining({
          plan_id: created[0].id,
          task_id: 'sub-1',
          position: 0
        })
      );

      db.daily_plan = origDailyPlan;
      db.tasks = origTasks;
      db.milestones = origMilestones;
    });
  });

  describe('Legacy Cutover (executeSprintCCutover)', () => {
    it('purges only today plans referencing leaf tasks (parent_task_id !== null)', async () => {
      const origDailyPlan = db.daily_plan;
      const origTasks = db.tasks;
      const origStreams = db.daily_plan_streams;

      const todayPlans = [
        { id: 'legacy-p1', user_id: userId, plan_date: todayStr, slot: 1, task_id: 'leaf-task-1' },
        { id: 'valid-p2', user_id: userId, plan_date: todayStr, slot: 2, task_id: 'parent-task-2' }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(todayPlans)
          }),
          toArray: vi.fn().mockResolvedValue(todayPlans)
        })
      };

      db.tasks = {
        get: vi.fn().mockImplementation(async (id) => {
          if (id === 'leaf-task-1') return { id, parent_task_id: 'some-parent-id' };
          if (id === 'parent-task-2') return { id, parent_task_id: null };
          return null;
        })
      };

      db.daily_plan_streams = {
        where: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ id: 'stream-1', plan_id: 'legacy-p1' }])
        })
      };

      const result = await executeSprintCCutover({ userId, todayStr });
      expect(result.executed).toBe(true);
      expect(result.purgedPlans).toBe(1);

      // Assert legacy stream and plan were queued for deletion
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('daily_plan_streams', { id: 'stream-1', user_id: userId });
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('daily_plan', { id: 'legacy-p1', user_id: userId });

      // Assert valid parent plan was NOT deleted
      expect(offlineApi.offlineDelete).not.toHaveBeenCalledWith('daily_plan', { id: 'valid-p2', user_id: userId });

      db.daily_plan = origDailyPlan;
      db.tasks = origTasks;
      db.daily_plan_streams = origStreams;
    });

    it('does nothing when no legacy leaf plans exist for today', async () => {
      const origDailyPlan = db.daily_plan;
      const origTasks = db.tasks;

      const cleanPlans = [
        { id: 'clean-p1', user_id: userId, plan_date: todayStr, slot: 1, task_id: 'parent-1' }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(cleanPlans)
          }),
          toArray: vi.fn().mockResolvedValue(cleanPlans)
        })
      };

      db.tasks = {
        get: vi.fn().mockResolvedValue({ id: 'parent-1', parent_task_id: null })
      };

      const result = await executeSprintCCutover({ userId, todayStr });
      expect(result.executed).toBe(false);
      expect(result.purgedPlans).toBe(0);
      expect(offlineApi.offlineDelete).not.toHaveBeenCalled();

      db.daily_plan = origDailyPlan;
      db.tasks = origTasks;
    });
  });
});
