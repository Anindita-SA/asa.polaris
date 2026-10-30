import { isOpenTask } from './taskState';

/**
 * Pure task filtering engine for Polaris Matrix Canvas and Constellation Views.
 * Enforces strict invariants for root node display and 14-Day Overlook protection.
 *
 * @param {Array} tasks - Array of all task records
 * @param {Object} options - Filter configuration options
 * @param {number} [options.overlookDays=14] - Horizon window in days for scheduled tasks
 * @param {boolean} [options.hideReminders=false] - Whether to suppress reminder category tasks
 * @param {boolean} [options.hidePolaris=false] - Whether to suppress internal polaris category tasks
 * @param {boolean} [options.hideUpkeep=false] - Whether to suppress upkeep category tasks
 * @param {Date|string|number} [options.currentDate=new Date()] - Reference date for deadline calculations
 * @returns {Array} Filtered list of tasks eligible to render on the 2D matrix canvas plane
 */
export function filterMatrixNodes(tasks = [], options = {}) {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];

  const {
    overlookDays = 14,
    hideReminders = false,
    hidePolaris = false,
    hideUpkeep = false,
    currentDate = new Date()
  } = options;

  const now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);

  // Set of parent task IDs that have child subtasks
  const parentIdsWithChildren = new Set();
  for (const t of tasks) {
    if (t && t.parent_task_id) {
      parentIdsWithChildren.add(t.parent_task_id);
    }
  }

  return tasks.filter((t) => {
    if (!t) return false;

    // Invariant 1: Child subtasks are NEVER rendered as independent root canvas nodes
    if (t.parent_task_id) return false;

    // Invariant 2: Tasks without an assigned quadrant stay in the Brain Dump tray
    if (t.quadrant === null || t.quadrant === undefined) return false;

    // Invariant 3: Completed or archived tasks are hidden from active matrix plane
    if (!isOpenTask(t)) return false;

    // Invariant 4: Category suppression
    if (t.category === 'habits') return false;
    if (hideReminders && t.category === 'reminders') return false;
    if (hidePolaris && (t.category === 'polaris' || (t.title || '').toLowerCase().includes('polaris'))) return false;
    if (hideUpkeep && t.category === 'upkeep') return false;

    const isParentProject = parentIdsWithChildren.has(t.id);

    // Invariant 6: Strict Overlook Protection
    // Standalone inbox tasks (unparented, status === 'inbox' without a scheduled deadline)
    // must NOT flood the constellation plane. They stay inside the Day Guide / Inbox drawer until scheduled.
    if (!isParentProject && t.status === 'inbox' && !t.deadline) {
      return false;
    }

    // Invariant 7: Overlook horizon window for scheduled deadlined tasks
    if (overlookDays > 0 && t.status === 'scheduled') {
      let deadlineDate = null;
      if (t.deadline) {
        deadlineDate = new Date(t.deadline);
        if (typeof t.deadline === 'string' && !t.deadline.includes('T')) {
          deadlineDate = new Date(t.deadline + 'T00:00:00');
        }
        deadlineDate.setHours(0, 0, 0, 0);
      }

      // Check if any incomplete child subtask has a deadline within the horizon window or is overdue
      const hasChildInOverlook = isParentProject && tasks.some((child) => {
        if (child && child.parent_task_id === t.id && child.status !== 'done' && child.deadline) {
          let childDate = new Date(child.deadline);
          if (typeof child.deadline === 'string' && !child.deadline.includes('T')) {
            childDate = new Date(child.deadline + 'T00:00:00');
          }
          childDate.setHours(0, 0, 0, 0);
          const childDiffDays = Math.ceil((childDate - now) / (1000 * 60 * 60 * 24));
          return childDiffDays <= overlookDays;
        }
        return false;
      });

      if (deadlineDate) {
        const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays > overlookDays && !hasChildInOverlook) {
          return false;
        }
      }
    }

    return true;
  });
}
