import { describe, it, expect } from 'vitest';
import { filterMatrixNodes } from './matrixNodeFilter';

describe('filterMatrixNodes', () => {
  const baseDate = new Date('2026-10-07T00:00:00');

  it('excludes child subtasks from root canvas nodes', () => {
    const tasks = [
      { id: 'sub-1', title: 'Child Step', parent_task_id: 'parent-1', quadrant: 'urgent_important', status: 'active' },
      { id: 'parent-1', title: 'Parent Sprint', parent_task_id: null, quadrant: 'urgent_important', status: 'active' }
    ];
    const filtered = filterMatrixNodes(tasks, { currentDate: baseDate });
    expect(filtered.map(t => t.id)).toEqual(['parent-1']);
  });

  it('excludes tasks without a quadrant (null or undefined)', () => {
    const tasks = [
      { id: '1', title: 'Inbox dump', quadrant: null, status: 'inbox' },
      { id: '2', title: 'Undef quad', quadrant: undefined, status: 'active' },
      { id: '3', title: 'With quad', quadrant: 'important_not_urgent', status: 'active' }
    ];
    const filtered = filterMatrixNodes(tasks, { currentDate: baseDate });
    expect(filtered.map(t => t.id)).toEqual(['3']);
  });

  it('excludes completed tasks (status === done)', () => {
    const tasks = [
      { id: '1', title: 'Done task', quadrant: 'urgent_important', status: 'done' },
      { id: '2', title: 'Active task', quadrant: 'urgent_important', status: 'active' }
    ];
    const filtered = filterMatrixNodes(tasks, { currentDate: baseDate });
    expect(filtered.map(t => t.id)).toEqual(['2']);
  });

  it('protects against unparented inbox tasks with no deadline flooding the canvas plane', () => {
    const tasks = [
      {
        id: 'flood-1',
        title: 'Review NPTEL lecture notes',
        status: 'inbox',
        quadrant: 'urgent_important',
        parent_task_id: null,
        deadline: null
      },
      {
        id: 'parent-project',
        title: 'Master Application Sprint',
        status: 'inbox',
        quadrant: 'important_not_urgent',
        parent_task_id: null,
        deadline: null
      },
      {
        id: 'child-1',
        title: 'Draft Personal Statement',
        parent_task_id: 'parent-project',
        status: 'active',
        quadrant: 'important_not_urgent'
      }
    ];

    const filtered = filterMatrixNodes(tasks, { currentDate: baseDate });
    // flood-1 is blocked because it has status inbox and no deadline and no subtasks
    // parent-project is permitted because it has child subtasks
    expect(filtered.map(t => t.id)).toEqual(['parent-project']);
  });

  it('enforces overlookDays horizon window for deadlined tasks', () => {
    const tasks = [
      { id: 'near', title: 'Due Soon', status: 'scheduled', quadrant: 'urgent_important', deadline: '2026-10-10' },
      { id: 'far', title: 'Due Next Month', status: 'scheduled', quadrant: 'important_not_urgent', deadline: '2026-11-20' },
      { id: 'overdue', title: 'Overdue', status: 'scheduled', quadrant: 'urgent_important', deadline: '2026-10-05' }
    ];

    const filtered = filterMatrixNodes(tasks, { overlookDays: 14, currentDate: baseDate });
    // 'far' is due in 44 days > 14 days, so excluded
    expect(filtered.map(t => t.id)).toEqual(['near', 'overdue']);
  });

  it('inherits overlook horizon eligibility for parent projects when a child subtask deadline is within horizon', () => {
    const tasks = [
      {
        id: 'parent-far',
        title: 'Master Application Sprint',
        status: 'scheduled',
        quadrant: 'urgent_important',
        parent_task_id: null,
        deadline: '2026-10-30' // 23 days away
      },
      {
        id: 'child-today',
        title: 'Draft Personal Statement',
        status: 'active',
        quadrant: 'urgent_important',
        parent_task_id: 'parent-far',
        deadline: '2026-10-08' // 1 day away (within 7D horizon)
      },
      {
        id: 'parent-no-active-child',
        title: 'Future Sabbatical Project',
        status: 'scheduled',
        quadrant: 'important_not_urgent',
        parent_task_id: null,
        deadline: '2026-10-30'
      },
      {
        id: 'child-also-far',
        title: 'Read Book 2',
        status: 'active',
        quadrant: 'important_not_urgent',
        parent_task_id: 'parent-no-active-child',
        deadline: '2026-10-28'
      }
    ];

    const filtered = filterMatrixNodes(tasks, { overlookDays: 7, currentDate: baseDate });
    // parent-far is retained because child-today is due in 1 day (<= 7D)
    // parent-no-active-child is excluded because both parent and child are > 7D away
    expect(filtered.map(t => t.id)).toEqual(['parent-far']);
  });

  it('filters reminders and polaris categories when flags are enabled', () => {
    const tasks = [
      { id: '1', title: 'Normal task', category: 'career', quadrant: 'urgent_important', status: 'active' },
      { id: '2', title: 'Reminder item', category: 'reminders', quadrant: 'urgent_important', status: 'active' },
      { id: '3', title: 'Fix bug #polaris', category: 'polaris', quadrant: 'urgent_important', status: 'active' },
      { id: '4', title: 'polaris test in title', category: 'normal', quadrant: 'urgent_important', status: 'active' }
    ];

    const filtered = filterMatrixNodes(tasks, { hideReminders: true, hidePolaris: true, currentDate: baseDate });
    expect(filtered.map(t => t.id)).toEqual(['1']);
  });

  it('filters upkeep category when hideUpkeep flag is enabled', () => {
    const tasks = [
      { id: '1', title: 'Normal task', category: 'career', quadrant: 'urgent_important', status: 'active' },
      { id: '2', title: 'Clean room', category: 'upkeep', quadrant: 'urgent_important', status: 'active' }
    ];

    const filtered = filterMatrixNodes(tasks, { hideUpkeep: true, currentDate: baseDate });
    expect(filtered.map(t => t.id)).toEqual(['1']);
  });

  it('handles empty inputs and malformed tasks safely', () => {
    expect(filterMatrixNodes(null)).toEqual([]);
    expect(filterMatrixNodes(undefined)).toEqual([]);
    expect(filterMatrixNodes([])).toEqual([]);
    expect(filterMatrixNodes([null, undefined, {}])).toEqual([]);
  });
});
