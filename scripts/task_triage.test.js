import { describe, it, expect, vi } from 'vitest';
import { deduplicateTasks, deduplicateActiveTasks, resolveDuplicates, incrementSkipCounts, detectStaleParentTasks, handleStaleParentTasks, evaluateParentTaskQuadrant, triageParentTasksUrgency, filterTasksForTriage } from './task_triage.js';
import { identifyDuplicatesAndMerge, runCleanup } from './cleanup_duplicates.js';

describe('task_triage deduplication and skip_count', () => {
  it('identifies unsorted tasks that duplicate existing active tasks and marks them as done', async () => {
    const existingActiveTasks = [
      { id: 'active-1', title: 'IELTS Writing Practice', status: 'active' },
      { id: 'active-2', title: 'TU Delft SOP Draft', status: 'scheduled' }
    ];

    const unsortedTasks = [
      { id: 'unsorted-1', title: 'ielts writing practice', notes: 'duplicate of active-1' },
      { id: 'unsorted-2', title: '  tu delft sop draft  ', notes: 'duplicate of active-2' },
      { id: 'unsorted-3', title: 'New Unique Task', notes: 'should be kept' }
    ];

    const { uniqueTasks, duplicateTaskIds } = deduplicateTasks(unsortedTasks, existingActiveTasks);

    expect(uniqueTasks.length).toBe(1);
    expect(uniqueTasks[0].id).toBe('unsorted-3');
    expect(uniqueTasks[0].title).toBe('New Unique Task');

    expect(duplicateTaskIds).toEqual(['unsorted-1', 'unsorted-2']);

    // Mock Supabase client to verify marking as done
    let updatedPayload = null;
    let targetIds = null;
    let targetUserId = null;

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => {
          updatedPayload = payload;
          return {
            in: vi.fn().mockImplementation((col, ids) => {
              targetIds = ids;
              return {
                eq: vi.fn().mockImplementation((col2, uid) => {
                  targetUserId = uid;
                  return Promise.resolve({ error: null });
                })
              };
            })
          };
        })
      })
    };

    const res = await resolveDuplicates(mockSupabase, 'user-xyz', duplicateTaskIds, false);
    expect(res.updatedCount).toBe(2);
    expect(updatedPayload).toEqual({ status: 'done' });
    expect(targetIds).toEqual(['unsorted-1', 'unsorted-2']);
    expect(targetUserId).toBe('user-xyz');
  });

  it('keeps only 1 unique item when unsorted inbox contains multiple duplicate items', async () => {
    const existingActiveTasks = [
      { id: 'active-99', title: 'Existing Independent Task', status: 'active' }
    ];

    const unsortedTasks = [
      { id: 'dup-a1', title: 'IELTS Speaking Practice', notes: 'copy 1' },
      { id: 'dup-a2', title: 'ielts speaking practice', notes: 'copy 2' },
      { id: 'dup-a3', title: '  IELTS Speaking Practice  ', notes: 'copy 3' },
      { id: 'dup-b1', title: 'Read Research Paper', notes: 'copy 1' },
      { id: 'dup-b2', title: 'read research paper', notes: 'copy 2' },
      { id: 'uniq-1', title: 'Unique Coding Session', notes: 'single' }
    ];

    const { uniqueTasks, duplicateTaskIds } = deduplicateTasks(unsortedTasks, existingActiveTasks);

    // Only 3 tasks should remain for triage: 1 IELTS Speaking, 1 Read Research Paper, 1 Unique Coding Session
    expect(uniqueTasks.length).toBe(3);
    expect(uniqueTasks.map(t => t.id)).toEqual(['dup-a1', 'dup-b1', 'uniq-1']);

    // The other 3 duplicates must be resolved
    expect(duplicateTaskIds).toEqual(['dup-a2', 'dup-a3', 'dup-b2']);

    let resolvedCount = 0;
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              resolvedCount = duplicateTaskIds.length;
              return Promise.resolve({ error: null });
            })
          })
        })
      })
    };

    await resolveDuplicates(mockSupabase, 'user-xyz', duplicateTaskIds, false);
    expect(resolvedCount).toBe(3);
  });

  it('correctly calculates and increments skip_count for triaged tasks', async () => {
    const tasks = [
      { id: 'task-1', title: 'Task with 0 skips', skip_count: 0 },
      { id: 'task-2', title: 'Task with existing 3 skips', skip_count: 3 },
      { id: 'task-3', title: 'Task with undefined skip count' },
      { id: 'task-4', title: 'Task with null skip count', skip_count: null }
    ];

    const updatesRecorded = [];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => ({
          eq: vi.fn().mockImplementation((col1, taskId) => ({
            eq: vi.fn().mockImplementation((col2, uid) => {
              updatesRecorded.push({ taskId, payload, uid });
              return Promise.resolve({ error: null });
            })
          }))
        }))
      })
    };

    const count = await incrementSkipCounts(mockSupabase, 'user-456', tasks, false);
    expect(count).toBe(4);
    expect(updatesRecorded).toEqual([
      { taskId: 'task-1', payload: { skip_count: 1 }, uid: 'user-456' },
      { taskId: 'task-2', payload: { skip_count: 4 }, uid: 'user-456' },
      { taskId: 'task-3', payload: { skip_count: 1 }, uid: 'user-456' },
      { taskId: 'task-4', payload: { skip_count: 1 }, uid: 'user-456' }
    ]);
  });
});

describe('task_triage active task deduplication across all active tasks', () => {
  it('deduplicates active tasks sharing the same normalized title keeping the most recent', () => {
    const activeTasks = [
      { id: 'task-old', title: 'Morning Exercise', created_at: '2026-09-01T08:00:00Z', status: 'active' },
      { id: 'task-new', title: '  morning exercise  ', created_at: '2026-09-05T08:00:00Z', status: 'scheduled' },
      { id: 'task-other', title: 'Evening Reading', created_at: '2026-09-02T08:00:00Z', status: 'active' }
    ];

    const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeTasks);

    expect(keptTasks.map(t => t.id)).toEqual(['task-new', 'task-other']);
    expect(duplicateTaskIds).toEqual(['task-old']);
  });

  it('deduplicates active tasks sharing the same source_template_id even if titles differ', () => {
    const activeTasks = [
      { id: 'task-tpl-old', title: 'Weekly House Cleanup', source_template_id: 'tpl-cleaning', created_at: '2026-09-01T10:00:00Z', status: 'active' },
      { id: 'task-tpl-new', title: 'Deep Cleaning Session', source_template_id: 'tpl-cleaning', created_at: '2026-09-08T10:00:00Z', status: 'active' },
      { id: 'task-unrelated', title: 'Independent Coding', source_template_id: null, created_at: '2026-09-04T10:00:00Z', status: 'active' }
    ];

    const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeTasks);

    expect(keptTasks.map(t => t.id)).toEqual(['task-tpl-new', 'task-unrelated']);
    expect(duplicateTaskIds).toEqual(['task-tpl-old']);
  });

  it('deduplicates active recurring task instances overlapping across title and source_template_id', () => {
    const activeTasks = [
      { id: 'task-1', title: 'Daily Journaling', source_template_id: 'tpl-journal', created_at: '2026-09-01T07:00:00Z', status: 'active' },
      { id: 'task-2', title: 'daily journaling', source_template_id: null, created_at: '2026-09-03T07:00:00Z', status: 'inbox' },
      { id: 'task-3', title: 'Daily Reflection & Journal', source_template_id: 'tpl-journal', created_at: '2026-09-07T07:00:00Z', status: 'active' }
    ];

    const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeTasks);

    // All three belong to the same component, task-3 is most recent
    expect(keptTasks.map(t => t.id)).toEqual(['task-3']);
    expect(duplicateTaskIds).toContain('task-1');
    expect(duplicateTaskIds).toContain('task-2');
    expect(duplicateTaskIds.length).toBe(2);
  });

  it('prioritizes most recent created_at timestamp when deduplicating', () => {
    const activeTasks = [
      { id: 'task-created-recently', title: 'Substack Article Draft', created_at: '2026-09-10T10:00:00Z', status: 'active' },
      { id: 'task-created-earlier', title: 'substack article draft', created_at: '2026-09-06T10:00:00Z', status: 'active' }
    ];

    const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeTasks);

    expect(keptTasks.map(t => t.id)).toEqual(['task-created-recently']);
    expect(duplicateTaskIds).toEqual(['task-created-earlier']);
  });

  it('handles empty task lists or lists with no duplicates safely', () => {
    const emptyResult = deduplicateActiveTasks([]);
    expect(emptyResult.keptTasks).toEqual([]);
    expect(emptyResult.duplicateTaskIds).toEqual([]);

    const singleTask = [{ id: 'single-1', title: 'Single Task', status: 'active' }];
    const singleResult = deduplicateActiveTasks(singleTask);
    expect(singleResult.keptTasks.map(t => t.id)).toEqual(['single-1']);
    expect(singleResult.duplicateTaskIds).toEqual([]);
  });

  it('does not deduplicate subtasks under different parent tasks against each other or root tasks', () => {
    const activeTasks = [
      { id: 'sub-p1-1', title: 'Write Intro Draft', parent_task_id: 'parent-1', status: 'active', created_at: '2026-09-01T10:00:00Z' },
      { id: 'sub-p2-1', title: 'Write Intro Draft', parent_task_id: 'parent-2', status: 'active', created_at: '2026-09-02T10:00:00Z' },
      { id: 'root-1', title: 'Write Intro Draft', parent_task_id: null, status: 'active', created_at: '2026-09-03T10:00:00Z' }
    ];

    const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeTasks);

    expect(keptTasks.length).toBe(3);
    expect(duplicateTaskIds).toEqual([]);
  });

  it('deduplicates subtasks under the same parent task', () => {
    const activeTasks = [
      { id: 'sub-p1-old', title: 'Write Task 1', parent_task_id: 'parent-1', status: 'active', created_at: '2026-09-01T10:00:00Z' },
      { id: 'sub-p1-new', title: 'write task 1', parent_task_id: 'parent-1', status: 'active', created_at: '2026-09-05T10:00:00Z' }
    ];

    const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeTasks);

    expect(keptTasks.map(t => t.id)).toEqual(['sub-p1-new']);
    expect(duplicateTaskIds).toEqual(['sub-p1-old']);
  });

  it('ignores child subtasks in allActiveTasks when deduplicating unsorted root tasks', () => {
    const existingActiveTasks = [
      { id: 'child-1', title: 'IELTS Writing Practice', parent_task_id: 'parent-ielts', status: 'active' },
      { id: 'root-active-1', title: 'Independent Coding', parent_task_id: null, status: 'active' }
    ];

    const unsortedTasks = [
      { id: 'unsorted-1', title: 'IELTS Writing Practice', parent_task_id: null, notes: 'Standalone task' },
      { id: 'unsorted-2', title: 'independent coding', parent_task_id: null, notes: 'Duplicate of root' }
    ];

    const { uniqueTasks, duplicateTaskIds } = deduplicateTasks(unsortedTasks, existingActiveTasks);

    expect(uniqueTasks.map(t => t.id)).toEqual(['unsorted-1']);
    expect(duplicateTaskIds).toEqual(['unsorted-2']);
  });
});

describe('cleanup_duplicates script logic', () => {
  it('merges duplicate tasks by keeping template-linked or earliest task, summing completion_count and merging completion_dates', () => {
    const tasks = [
      {
        id: 'task-no-template-old',
        title: 'IELTS Writing Practice',
        source_template_id: null,
        created_at: '2026-09-01T10:00:00Z',
        completion_count: 2,
        completion_dates: ['2026-09-02', '2026-09-03']
      },
      {
        id: 'task-with-template',
        title: 'ielts writing practice',
        source_template_id: 'template-uuid-1',
        created_at: '2026-09-05T10:00:00Z',
        completion_count: 3,
        completion_dates: ['2026-09-03', '2026-09-06']
      },
      {
        id: 'task-no-template-new',
        title: '  IELTS Writing Practice  ',
        source_template_id: null,
        created_at: '2026-09-10T10:00:00Z',
        completion_count: 1,
        completion_dates: ['2026-09-10']
      },
      {
        id: 'unique-task-1',
        title: 'Unique Task',
        source_template_id: null,
        created_at: '2026-09-08T10:00:00Z',
        completion_count: 0,
        completion_dates: []
      }
    ];

    const resolutions = identifyDuplicatesAndMerge(tasks);

    expect(resolutions.length).toBe(1);
    const res = resolutions[0];

    // Should prioritize the task with source_template_id
    expect(res.keptTask.id).toBe('task-with-template');
    expect(res.duplicateIds).toEqual(['task-no-template-old', 'task-no-template-new']);

    // Total completion count: 2 + 3 + 1 = 6
    expect(res.totalCompletionCount).toBe(6);

    // Merged completion dates: union sorted
    expect(res.mergedCompletionDates).toEqual([
      '2026-09-02',
      '2026-09-03',
      '2026-09-06',
      '2026-09-10'
    ]);
  });

  it('keeps earliest created_at when neither duplicate has a source_template_id', () => {
    const tasks = [
      {
        id: 'newer-task',
        title: 'Morning Run',
        source_template_id: null,
        created_at: '2026-09-10T08:00:00Z',
        completion_count: 1,
        completion_dates: ['2026-09-10']
      },
      {
        id: 'older-task',
        title: 'morning run',
        source_template_id: null,
        created_at: '2026-09-01T08:00:00Z',
        completion_count: 4,
        completion_dates: ['2026-09-01', '2026-09-02']
      }
    ];

    const resolutions = identifyDuplicatesAndMerge(tasks);
    expect(resolutions.length).toBe(1);
    expect(resolutions[0].keptTask.id).toBe('older-task');
    expect(resolutions[0].duplicateIds).toEqual(['newer-task']);
    expect(resolutions[0].totalCompletionCount).toBe(5);
    expect(resolutions[0].mergedCompletionDates).toEqual(['2026-09-01', '2026-09-02', '2026-09-10']);
  });

  it('does not merge subtasks belonging to different parent tasks in cleanup_duplicates', () => {
    const tasks = [
      { id: 'sub-1', title: 'Review notes', parent_task_id: 'parent-a', created_at: '2026-09-01T10:00:00Z' },
      { id: 'sub-2', title: 'review notes', parent_task_id: 'parent-b', created_at: '2026-09-02T10:00:00Z' }
    ];

    const resolutions = identifyDuplicatesAndMerge(tasks);
    expect(resolutions.length).toBe(0);
  });
});

describe('task_triage stale parent task detection and handling', () => {
  const referenceDate = new Date('2026-09-13T12:00:00Z');

  it('detects parent tasks whose incomplete children have not moved status in 3 days', () => {
    const tasks = [
      { id: 'parent-stale', title: 'Apply for TU Delft Fellowship', status: 'active' },
      { id: 'child-stale-1', title: 'Write SOP draft', parent_task_id: 'parent-stale', status: 'active', created_at: '2026-09-09T10:00:00Z' },
      { id: 'child-stale-2', title: 'Request reference letter', parent_task_id: 'parent-stale', status: 'inbox', created_at: '2026-09-08T10:00:00Z' },
      
      { id: 'parent-active', title: 'Build Hardware Prototype', status: 'active' },
      { id: 'child-active-1', title: 'Design PCB in KiCAD', parent_task_id: 'parent-active', status: 'active', created_at: '2026-09-12T10:00:00Z' },
      { id: 'child-active-2', title: 'Order components', parent_task_id: 'parent-active', status: 'done', created_at: '2026-09-05T10:00:00Z' },

      { id: 'parent-completed', title: 'Submit Conference Abstract', status: 'active' },
      { id: 'child-done-1', title: 'Draft abstract', parent_task_id: 'parent-completed', status: 'done', created_at: '2026-09-01T10:00:00Z' },

      { id: 'single-task', title: 'Read Climate Tech Paper', status: 'active', parent_task_id: null, created_at: '2026-09-01T10:00:00Z' }
    ];

    const staleParents = detectStaleParentTasks(tasks, referenceDate);
    expect(staleParents.length).toBe(1);
    expect(staleParents[0].id).toBe('parent-stale');
  });

  it('ignores parked parent tasks and parked child subtasks when detecting stale parents', () => {
    const tasks = [
      { id: 'parent-parked', title: 'Parked Parent Project', status: 'parked' },
      { id: 'child-1', title: 'Parked Subtask 1', parent_task_id: 'parent-parked', status: 'inbox', created_at: '2026-09-01T10:00:00Z' },

      { id: 'parent-with-parked-kids', title: 'Active Parent With Parked Subtasks', status: 'active' },
      { id: 'child-2', title: 'Parked Subtask 2', parent_task_id: 'parent-with-parked-kids', status: 'parked', created_at: '2026-09-01T10:00:00Z' }
    ];

    const staleParents = detectStaleParentTasks(tasks, referenceDate);
    expect(staleParents.length).toBe(0);
  });

  it('handles stale parent tasks by incrementing skip_count and appending stale note', async () => {
    const staleParents = [
      { id: 'parent-1', title: 'Stale Application Parent', skip_count: 2, notes: 'Existing application notes.' },
      { id: 'parent-2', title: 'Another Stale Parent', skip_count: null, notes: null }
    ];

    const updatesRecorded = [];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => ({
          eq: vi.fn().mockImplementation((col1, taskId) => ({
            eq: vi.fn().mockImplementation((col2, uid) => {
              updatesRecorded.push({ taskId, payload, uid });
              return Promise.resolve({ error: null });
            })
          }))
        }))
      })
    };

    const count = await handleStaleParentTasks(mockSupabase, 'user-123', staleParents, false);
    expect(count).toBe(2);
    expect(updatesRecorded).toEqual([
      {
        taskId: 'parent-1',
        payload: {
          skip_count: 3,
          notes: 'Existing application notes.\n[Stale: Subtasks inactive for 3+ days]'
        },
        uid: 'user-123'
      },
      {
        taskId: 'parent-2',
        payload: {
          skip_count: 1,
          notes: '[Stale: Subtasks inactive for 3+ days]'
        },
        uid: 'user-123'
      }
    ]);
  });

  it('executes resolveDuplicates, incrementSkipCounts, and handleStaleParentTasks cleanly in dry run mode', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          }),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      })
    };

    const duplicateRes = await resolveDuplicates(mockSupabase, 'user-1', ['dup-1'], true);
    expect(duplicateRes.updatedCount).toBe(1);

    const skipRes = await incrementSkipCounts(mockSupabase, 'user-1', [{ id: 'task-1', skip_count: 0 }], true);
    expect(skipRes).toBe(1);

    const staleRes = await handleStaleParentTasks(mockSupabase, 'user-1', [{ id: 'parent-1', skip_count: 1 }], true);
    expect(staleRes).toBe(1);
  });
});

describe('task_triage parent task urgency inheritance', () => {
  const referenceDate = new Date('2026-09-13T12:00:00Z');

  it('evaluates parent quadrant as urgent_important when an incomplete child subtask is due within 48h', () => {
    const parentTask = {
      id: 'parent-1',
      title: 'TU Delft Application',
      status: 'active',
      quadrant: 'important_not_urgent',
      deadline: '2026-10-01'
    };

    const childSubtasks = [
      {
        id: 'child-1',
        parent_task_id: 'parent-1',
        title: 'Submit Transcript',
        status: 'active',
        deadline: '2026-09-14' // Due tomorrow (within 48h)
      },
      {
        id: 'child-2',
        parent_task_id: 'parent-1',
        title: 'Draft Motivation Letter',
        status: 'active',
        deadline: '2026-09-25'
      }
    ];

    const result = evaluateParentTaskQuadrant(parentTask, childSubtasks, referenceDate);
    expect(result).toBe('urgent_important');
  });

  it('evaluates parent quadrant as important_not_urgent when all urgent child subtasks are done and parent deadline is > 3 days away', () => {
    const parentTask = {
      id: 'parent-1',
      title: 'TU Delft Application',
      status: 'active',
      quadrant: 'urgent_important',
      deadline: '2026-09-30' // > 3 days away
    };

    const childSubtasks = [
      {
        id: 'child-1',
        parent_task_id: 'parent-1',
        title: 'Submit Transcript',
        status: 'done', // Already completed
        deadline: '2026-09-14'
      },
      {
        id: 'child-2',
        parent_task_id: 'parent-1',
        title: 'Draft Motivation Letter',
        status: 'active',
        deadline: '2026-09-25' // > 3 days away
      }
    ];

    const result = evaluateParentTaskQuadrant(parentTask, childSubtasks, referenceDate);
    expect(result).toBe('important_not_urgent');
  });

  it('does not downgrade parent quadrant to important_not_urgent if parent task own deadline is <= 3 days away', () => {
    const parentTask = {
      id: 'parent-1',
      title: 'Urgent Direct Parent Task',
      status: 'active',
      quadrant: 'urgent_important',
      deadline: '2026-09-15' // Within 2 days!
    };

    const childSubtasks = [
      {
        id: 'child-1',
        parent_task_id: 'parent-1',
        title: 'Completed subtask',
        status: 'done',
        deadline: '2026-09-14'
      }
    ];

    const result = evaluateParentTaskQuadrant(parentTask, childSubtasks, referenceDate);
    // Should return null because parent's own deadline makes it urgent, so it should not be downgraded to important_not_urgent
    expect(result).toBeNull();
  });

  it('evaluates parent quadrant as null when parent task has no deadline (deadline: null)', () => {
    const parentTask = {
      id: 'parent-undated',
      title: 'Undated Curriculum Master Parent',
      status: 'active',
      quadrant: 'important_not_urgent',
      deadline: null
    };

    const childSubtasks = [
      {
        id: 'child-1',
        parent_task_id: 'parent-undated',
        title: 'Child subtask 1',
        status: 'active',
        deadline: '2026-09-25'
      }
    ];

    const result = evaluateParentTaskQuadrant(parentTask, childSubtasks, referenceDate);
    expect(result).toBeNull();
  });

  it('evaluates parent quadrant as null when parent task is parked (status: parked)', () => {
    const parentTask = {
      id: 'parent-parked',
      title: 'Parked Curriculum Parent',
      status: 'parked',
      quadrant: null,
      deadline: '2026-10-01'
    };

    const childSubtasks = [
      {
        id: 'child-1',
        parent_task_id: 'parent-parked',
        title: 'Urgent child subtask',
        status: 'active',
        deadline: '2026-09-14'
      }
    ];

    const result = evaluateParentTaskQuadrant(parentTask, childSubtasks, referenceDate);
    expect(result).toBeNull();
  });

  it('ignores parked child subtasks when evaluating parent urgency', () => {
    const parentTask = {
      id: 'parent-with-parked-child',
      title: 'Active Project With Parked Subtask',
      status: 'active',
      quadrant: 'urgent_important',
      deadline: '2026-09-30' // > 3 days away
    };

    const childSubtasks = [
      {
        id: 'child-urgent-parked',
        parent_task_id: 'parent-with-parked-child',
        title: 'Parked subtask due tomorrow',
        status: 'parked',
        deadline: '2026-09-14'
      },
      {
        id: 'child-active-far',
        parent_task_id: 'parent-with-parked-child',
        title: 'Active subtask due later',
        status: 'active',
        deadline: '2026-09-25'
      }
    ];

    const result = evaluateParentTaskQuadrant(parentTask, childSubtasks, referenceDate);
    // Because urgent child is parked, it is ignored; parent deadline is > 3 days away so result is important_not_urgent
    expect(result).toBe('important_not_urgent');
  });

  it('triages and updates parent task quadrant in database via triageParentTasksUrgency', async () => {
    const allTasks = [
      {
        id: 'parent-10',
        title: 'Grant Proposal',
        status: 'active',
        quadrant: 'important_not_urgent',
        deadline: '2026-10-01'
      },
      {
        id: 'child-10-1',
        parent_task_id: 'parent-10',
        title: 'Budget spreadsheet submission',
        status: 'active',
        deadline: '2026-09-14' // Due tomorrow
      }
    ];

    const updatesRecorded = [];
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => ({
          eq: vi.fn().mockImplementation((col1, taskId) => ({
            eq: vi.fn().mockImplementation((col2, uid) => {
              updatesRecorded.push({ taskId, payload, uid });
              return Promise.resolve({ error: null });
            })
          }))
        }))
      })
    };

    const updates = await triageParentTasksUrgency(mockSupabase, 'user-999', allTasks, false, referenceDate);
    expect(updates.length).toBe(1);
    expect(updates[0].newQuadrant).toBe('urgent_important');
    expect(updatesRecorded).toEqual([
      {
        taskId: 'parent-10',
        payload: { quadrant: 'urgent_important' },
        uid: 'user-999'
      }
    ]);
  });

  it('clears quadrant to null when undated parent has important_not_urgent bug output', async () => {
    const allTasks = [
      {
        id: 'parent-curriculum-bug',
        title: 'Embedded Systems & C Firmware Mastery',
        status: 'inbox',
        quadrant: 'important_not_urgent',
        deadline: null
      },
      {
        id: 'child-curriculum-1',
        parent_task_id: 'parent-curriculum-bug',
        title: 'Set up toolchain',
        status: 'inbox',
        deadline: null
      }
    ];

    const updatesRecorded = [];
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => ({
          eq: vi.fn().mockImplementation((col1, taskId) => ({
            eq: vi.fn().mockImplementation((col2, uid) => {
              updatesRecorded.push({ taskId, payload, uid });
              return Promise.resolve({ error: null });
            })
          }))
        }))
      })
    };

    const updates = await triageParentTasksUrgency(mockSupabase, 'user-999', allTasks, false, referenceDate);
    expect(updates.length).toBe(1);
    expect(updates[0].newQuadrant).toBeNull();
    expect(updatesRecorded).toEqual([
      {
        taskId: 'parent-curriculum-bug',
        payload: { quadrant: null },
        uid: 'user-999'
      }
    ]);
  });

  it('preserves user hand-placed quadrant on undated parent task and does not wipe it', async () => {
    const allTasks = [
      {
        id: 'parent-hand-placed',
        title: 'Execute Cold Email Wave (Post-IELTS)',
        status: 'active',
        quadrant: 'urgent_important', // Hand-placed urgent_important, NOT the bug output
        deadline: null
      },
      {
        id: 'child-email-1',
        parent_task_id: 'parent-hand-placed',
        title: 'Send batch 1',
        status: 'active',
        deadline: null
      }
    ];

    const updatesRecorded = [];
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => ({
          eq: vi.fn().mockImplementation((col1, taskId) => ({
            eq: vi.fn().mockImplementation((col2, uid) => {
              updatesRecorded.push({ taskId, payload, uid });
              return Promise.resolve({ error: null });
            })
          }))
        }))
      })
    };

    const updates = await triageParentTasksUrgency(mockSupabase, 'user-999', allTasks, false, referenceDate);
    // Must NOT wipe the hand-placed quadrant
    expect(updates.length).toBe(0);
    expect(updatesRecorded.length).toBe(0);
  });

  it('ignores parked parent tasks in triageParentTasksUrgency', async () => {
    const allTasks = [
      {
        id: 'parent-parked',
        title: 'Foundational Disciplines',
        status: 'parked',
        quadrant: 'important_not_urgent',
        deadline: null
      },
      {
        id: 'child-1',
        parent_task_id: 'parent-parked',
        title: 'Read chapter 1',
        status: 'inbox',
        deadline: null
      }
    ];

    const updatesRecorded = [];
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => ({
          eq: vi.fn().mockImplementation((col1, taskId) => ({
            eq: vi.fn().mockImplementation((col2, uid) => {
              updatesRecorded.push({ taskId, payload, uid });
              return Promise.resolve({ error: null });
            })
          }))
        }))
      })
    };

    const updates = await triageParentTasksUrgency(mockSupabase, 'user-999', allTasks, false, referenceDate);
    expect(updates.length).toBe(0);
    expect(updatesRecorded.length).toBe(0);
  });
});

describe('filterTasksForTriage precedence and exclusion logic', () => {
  it('excludes parent tasks that have subtasks and habit tasks from unsorted triage', () => {
    const parentTaskIdsWithChildren = new Set(['parent-with-kids', 'another-parent']);
    const unsortedTasks = [
      { id: 'parent-with-kids', title: 'Parent Task With Subtasks', category: 'career' },
      { id: 'standalone-task-1', title: 'Standalone Task Without Children', category: 'career' },
      { id: 'habit-task-1', title: 'Daily Workout', category: 'habits' },
      { id: 'another-parent', title: 'Another Parent Project', category: 'general' },
      { id: 'standalone-task-2', title: 'Read Research Paper', category: 'academic' }
    ];

    const filtered = filterTasksForTriage(unsortedTasks, parentTaskIdsWithChildren);
    expect(filtered.map(t => t.id)).toEqual(['standalone-task-1', 'standalone-task-2']);
  });

  it('excludes parked tasks from unsorted triage regardless of deadline', () => {
    const unsortedTasks = [
      { id: 'parked-with-deadline', title: 'Parked task with date', status: 'parked', deadline: '2026-11-15' },
      { id: 'parked-no-deadline', title: 'Parked task no date', status: 'parked', deadline: null },
      { id: 'normal-active', title: 'Active task', status: 'active', deadline: '2026-11-15' }
    ];

    const filtered = filterTasksForTriage(unsortedTasks, new Set());
    expect(filtered.map(t => t.id)).toEqual(['normal-active']);
  });

  it('excludes curriculum and opportunity tasks without deadline, but includes them when scheduled with a deadline', () => {
    const unsortedTasks = [
      { id: 'curriculum-undated', title: 'Curriculum Master Task', category: 'curriculum', status: 'inbox', deadline: null },
      { id: 'curriculum-dated', title: 'Curriculum Sprint Module', category: 'curriculum', status: 'inbox', deadline: '2026-11-20' },
      { id: 'opp-undated', title: 'Opportunistic Mentorship', category: 'opportunities', status: 'inbox', deadline: null },
      { id: 'opp-dated', title: 'Scholarship Application', category: 'opportunities', status: 'inbox', deadline: '2026-11-25' }
    ];

    const filtered = filterTasksForTriage(unsortedTasks, new Set());
    expect(filtered.map(t => t.id)).toEqual(['curriculum-dated', 'opp-dated']);
  });

  it('includes deadline-less inbox tasks in unsorted triage now that no-deadline filter is removed', () => {
    const unsortedTasks = [
      { id: 'inbox-brain-dump', title: 'Random idea captured', status: 'inbox', deadline: null },
      { id: 'curriculum-container', title: 'Applied Skills Track', category: 'curriculum', status: 'active', deadline: null },
      { id: 'scheduled-inbox-task', title: 'Future task', status: 'inbox', deadline: '2026-11-15' },
      { id: 'active-task', title: 'Active Task', status: 'active', deadline: null }
    ];

    const filtered = filterTasksForTriage(unsortedTasks, new Set());
    // inbox-brain-dump is now triaged (not excluded) because task parking protects backlogged tasks
    expect(filtered.map(t => t.id)).toEqual(['inbox-brain-dump', 'scheduled-inbox-task', 'active-task']);
  });
});
