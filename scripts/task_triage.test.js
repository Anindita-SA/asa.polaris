import { describe, it, expect, vi } from 'vitest';
import { deduplicateTasks, resolveDuplicates, incrementSkipCounts } from './task_triage.js';
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
});
