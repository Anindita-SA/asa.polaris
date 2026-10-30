/**
 * Shared task state helper functions.
 * Enforces unified open/active checks across Polaris.
 */

/**
 * Checks whether a task is open (i.e. neither completed nor archived).
 * Accepts either a task record object or a raw status string.
 *
 * @param {object|string|null|undefined} taskOrStatus
 * @returns {boolean}
 */
export function isOpenTask(taskOrStatus) {
  if (!taskOrStatus) return false;
  const status = typeof taskOrStatus === 'string' ? taskOrStatus : taskOrStatus.status;
  return status !== 'done' && status !== 'archived';
}
