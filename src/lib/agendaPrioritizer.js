// Domain module for Daily Task Audit alignment, priority ranking, and candidate sorting

export const DEFAULT_AUDIT_PRIMARIES = [
  'Portfolio: Replace AI Product Sketches with Real ID Sketches',
  'Agri Solar Survey Paper: Phase 2 (Reading & Synthesis)',
  'DAB Converter & Power Electronics EMC Research (Dr. Vignesh Kumar)'
]

/**
 * Calculates the audit directive priority index (0-based) for a given task.
 * Returns -1 if the task does not match any audit item in auditList.
 */
export function getAuditRank(task, auditList) {
  if (!task || !auditList || !Array.isArray(auditList)) return -1
  const titleLower = (task.title || '').toLowerCase().trim()

  for (let i = 0; i < auditList.length; i++) {
    const item = auditList[i]
    if (!item) continue

    if (typeof item === 'string') {
      if (item === task.id) return i
      const itemLower = item.toLowerCase().trim()
      if (titleLower === itemLower) return i
      if (titleLower.includes(itemLower) || itemLower.includes(titleLower)) return i

      // Semantic keywords for standard daily audit targets
      const isPortfolioTarget = itemLower.includes('portfolio') && (itemLower.includes('sketch') || itemLower.includes('replace'))
      const isPortfolioTask = titleLower.includes('portfolio') && titleLower.includes('sketch')
      if (isPortfolioTarget && isPortfolioTask) return i

      const isAgriTarget = itemLower.includes('agri') && (itemLower.includes('solar') || itemLower.includes('survey') || itemLower.includes('phase 2'))
      const isAgriTask = titleLower.includes('agri') && (titleLower.includes('solar') || titleLower.includes('survey'))
      if (isAgriTarget && isAgriTask) return i

      const isDabTarget = itemLower.includes('dab converter') || (itemLower.includes('vignesh') && itemLower.includes('emc'))
      const isDabTask = titleLower.includes('dab converter') || (titleLower.includes('vignesh') && titleLower.includes('emc'))
      if (isDabTarget && isDabTask) return i
    } else if (typeof item === 'object') {
      if (item.id && item.id === task.id) return i
      if (item.title) {
        const itemLower = item.title.toLowerCase().trim()
        if (titleLower === itemLower) return i
        if (titleLower.includes(itemLower) || itemLower.includes(titleLower)) return i

        const isPortfolioTarget = itemLower.includes('portfolio') && (itemLower.includes('sketch') || itemLower.includes('replace'))
        const isPortfolioTask = titleLower.includes('portfolio') && titleLower.includes('sketch')
        if (isPortfolioTarget && isPortfolioTask) return i

        const isAgriTarget = itemLower.includes('agri') && (itemLower.includes('solar') || itemLower.includes('survey') || itemLower.includes('phase 2'))
        const isAgriTask = titleLower.includes('agri') && (titleLower.includes('solar') || titleLower.includes('survey'))
        if (isAgriTarget && isAgriTask) return i

        const isDabTarget = itemLower.includes('dab converter') || (itemLower.includes('vignesh') && itemLower.includes('emc'))
        const isDabTask = titleLower.includes('dab converter') || (titleLower.includes('vignesh') && titleLower.includes('emc'))
        if (isDabTarget && isDabTask) return i
      }
    }
  }
  return -1
}

/**
 * Safely reads and parses audit directives from localStorage.
 * Falls back to DEFAULT_AUDIT_PRIMARIES if not found or invalid.
 */
export function getStoredAuditList(todayStr) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_AUDIT_PRIMARIES
  }
  try {
    const raw = localStorage.getItem(`polaris_audit_directives_${todayStr}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
      if (parsed && Array.isArray(parsed.primaries) && parsed.primaries.length > 0) {
        return parsed.primaries
      }
    }
  } catch (e) {
    console.warn('Error reading stored audit directives:', e)
  }
  return DEFAULT_AUDIT_PRIMARIES
}

/**
 * 4-tier sorting for candidate primaries:
 * 1. Saved manual drag reorder (polaris_today_order_<date>)
 * 2. Incomplete tasks before completed tasks
 * 3. Daily Task Audit directives rank (matching P0 targets)
 * 4. Priority heuristics: deadline today, quadrant = urgent_important, parent tasks, sort_order
 */
export function sortCandidatePrimaries(candidates = [], { savedOrder = [], auditList = DEFAULT_AUDIT_PRIMARIES, todayStr = '' } = {}) {
  const list = [...candidates]
  const effectiveAudit = Array.isArray(auditList) && auditList.length > 0 ? auditList : DEFAULT_AUDIT_PRIMARIES

  list.sort((a, b) => {
    // 1. Saved manual drag reorder takes top priority if explicitly set
    if (savedOrder && savedOrder.length > 0) {
      const idxA = savedOrder.indexOf(a.id)
      const idxB = savedOrder.indexOf(b.id)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
    }

    // 2. Prioritize incomplete tasks first
    if (a.completed && !b.completed) return 1
    if (!a.completed && b.completed) return -1

    // 3. Default auto-alignment: prioritize matching audit primary titles/directives
    const rankA = getAuditRank(a, effectiveAudit)
    const rankB = getAuditRank(b, effectiveAudit)
    if (rankA !== -1 && rankB !== -1) return rankA - rankB
    if (rankA !== -1) return -1
    if (rankB !== -1) return 1

    // 4. Overdue P0 critical tasks or due today
    const priorityA = (a.deadline === todayStr ? 10 : 0) + (a.quadrant === 'urgent_important' ? 5 : 0) + (a.subtasks_total > 0 ? 3 : 0)
    const priorityB = (b.deadline === todayStr ? 10 : 0) + (b.quadrant === 'urgent_important' ? 5 : 0) + (b.subtasks_total > 0 ? 3 : 0)
    if (priorityA !== priorityB) return priorityB - priorityA

    const orderA = a.sort_order != null ? a.sort_order : Infinity
    const orderB = b.sort_order != null ? b.sort_order : Infinity
    if (orderA !== orderB) return orderA - orderB

    return 0
  })

  return list
}

/**
 * Builds the top 3 primaries matching audit directives,
 * filling any remaining slots with top candidate primaries.
 */
export function buildAlignedOrder(tasks = [], candidatePrimaries = [], auditList = DEFAULT_AUDIT_PRIMARIES) {
  const effectiveAudit = Array.isArray(auditList) && auditList.length > 0 ? auditList : DEFAULT_AUDIT_PRIMARIES
  const orderedTasks = []
  const usedIds = new Set()

  effectiveAudit.forEach((target) => {
    const match = tasks.find(t => !usedIds.has(t.id) && getAuditRank(t, [target]) !== -1)
    if (match) {
      orderedTasks.push(match)
      usedIds.add(match.id)
    }
  })

  candidatePrimaries.forEach((t) => {
    if (!usedIds.has(t.id) && orderedTasks.length < 3) {
      orderedTasks.push(t)
      usedIds.add(t.id)
    }
  })

  return orderedTasks
}
