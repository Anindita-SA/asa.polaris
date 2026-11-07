// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_AUDIT_PRIMARIES,
  getAuditRank,
  getStoredAuditList,
  sortCandidatePrimaries,
  buildAlignedOrder
} from './agendaPrioritizer'

describe('agendaPrioritizer domain module', () => {
  const todayStr = '2026-10-26'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('DEFAULT_AUDIT_PRIMARIES', () => {
    it('contains the 3 canonical Master\'s application critical P0 targets', () => {
      expect(DEFAULT_AUDIT_PRIMARIES).toHaveLength(3)
      expect(DEFAULT_AUDIT_PRIMARIES[0]).toBe('Draft 1-page conducted EMI paper proposal & research scope pitch')
      expect(DEFAULT_AUDIT_PRIMARIES[1]).toBe('Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model')
      expect(DEFAULT_AUDIT_PRIMARIES[2]).toBe('Academic recommendation letter draft final review & dispatch')
    })
  })

  describe('getAuditRank', () => {
    it('returns exact index for matching canonical titles', () => {
      expect(getAuditRank({ title: 'Draft 1-page conducted EMI paper proposal & research scope pitch' }, DEFAULT_AUDIT_PRIMARIES)).toBe(0)
      expect(getAuditRank({ title: 'Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model' }, DEFAULT_AUDIT_PRIMARIES)).toBe(1)
      expect(getAuditRank({ title: 'Academic recommendation letter draft final review & dispatch' }, DEFAULT_AUDIT_PRIMARIES)).toBe(2)
    })

    it('matches by task.id when directives specify IDs', () => {
      const directiveList = ['custom-id-1', 'custom-id-2']
      expect(getAuditRank({ id: 'custom-id-1', title: 'Random Title' }, directiveList)).toBe(0)
      expect(getAuditRank({ id: 'custom-id-2', title: 'Another Title' }, directiveList)).toBe(1)
      expect(getAuditRank({ id: 'custom-id-3', title: 'Non-matching' }, directiveList)).toBe(-1)
    })

    it('matches object-based directives with id or title', () => {
      const objectDirectives = [
        { id: 'obj-1', title: 'First Target' },
        { title: 'Second Target' }
      ]
      expect(getAuditRank({ id: 'obj-1', title: 'Different Title' }, objectDirectives)).toBe(0)
      expect(getAuditRank({ id: 'obj-2', title: 'Second Target' }, objectDirectives)).toBe(1)
      expect(getAuditRank({ id: 'obj-3', title: 'Third' }, objectDirectives)).toBe(-1)
    })

    it('matches semantic keywords for EMI proposal, LISN Simulink, and recommendation letter tasks', () => {
      expect(getAuditRank({ title: 'Draft conducted EMI pitch proposal for faculty advisor' }, DEFAULT_AUDIT_PRIMARIES)).toBe(0)
      expect(getAuditRank({ title: 'DAB converter 50-ohm LISN Simulink modeling' }, DEFAULT_AUDIT_PRIMARIES)).toBe(1)
      expect(getAuditRank({ title: 'Final review of recommendation letter draft' }, DEFAULT_AUDIT_PRIMARIES)).toBe(2)
    })

    it('returns -1 for non-matching tasks and handles null/undefined inputs gracefully', () => {
      expect(getAuditRank(null, DEFAULT_AUDIT_PRIMARIES)).toBe(-1)
      expect(getAuditRank({ title: 'Clean bedroom' }, null)).toBe(-1)
      expect(getAuditRank({ title: 'Wash shoes' }, DEFAULT_AUDIT_PRIMARIES)).toBe(-1)
    })
  })

  describe('getStoredAuditList', () => {
    it('returns DEFAULT_AUDIT_PRIMARIES when localStorage has no entry', () => {
      expect(getStoredAuditList(todayStr)).toEqual(DEFAULT_AUDIT_PRIMARIES)
    })

    it('returns array stored in polaris_audit_directives_<date>', () => {
      const custom = ['Target A', 'Target B']
      localStorage.setItem(`polaris_audit_directives_${todayStr}`, JSON.stringify(custom))
      expect(getStoredAuditList(todayStr)).toEqual(custom)
    })

    it('extracts primaries array when stored as an object', () => {
      const obj = { primaries: ['Custom Primary 1', 'Custom Primary 2'] }
      localStorage.setItem(`polaris_audit_directives_${todayStr}`, JSON.stringify(obj))
      expect(getStoredAuditList(todayStr)).toEqual(obj.primaries)
    })

    it('falls back to DEFAULT_AUDIT_PRIMARIES on invalid JSON', () => {
      localStorage.setItem(`polaris_audit_directives_${todayStr}`, 'invalid-json{')
      expect(getStoredAuditList(todayStr)).toEqual(DEFAULT_AUDIT_PRIMARIES)
    })
  })

  describe('sortCandidatePrimaries', () => {
    it('prioritizes explicit savedOrder above all else', () => {
      const candidates = [
        { id: 'task-1', title: 'Task 1', completed: false },
        { id: 'task-2', title: 'Task 2', completed: false },
        { id: 'task-3', title: 'Task 3', completed: false }
      ]
      const sorted = sortCandidatePrimaries(candidates, {
        savedOrder: ['task-3', 'task-1', 'task-2'],
        todayStr
      })
      expect(sorted.map(t => t.id)).toEqual(['task-3', 'task-1', 'task-2'])
    })

    it('prioritizes incomplete tasks over already-completed tasks', () => {
      const candidates = [
        { id: 'done-p0', title: 'Completed P0 Task', completed: true, quadrant: 'urgent_important', deadline: todayStr },
        { id: 'active-1', title: 'Active 1', completed: false, quadrant: 'urgent_important', deadline: todayStr },
        { id: 'active-2', title: 'Active 2', completed: false, quadrant: 'urgent_important', deadline: todayStr }
      ]
      const sorted = sortCandidatePrimaries(candidates, { todayStr })
      expect(sorted[0].id).toBe('active-1')
      expect(sorted[1].id).toBe('active-2')
      expect(sorted[2].id).toBe('done-p0')
    })

    it('auto-aligns audit P0 primaries over random tasks due today', () => {
      const candidates = [
        { id: 'routine', title: 'Routine Task Due Today', completed: false, deadline: todayStr, quadrant: 'urgent_important' },
        { id: 'lor', title: 'Academic recommendation letter draft final review & dispatch', completed: false, deadline: '2026-11-04' },
        { id: 'prop', title: 'Draft 1-page conducted EMI paper proposal & research scope pitch', completed: false, deadline: '2026-11-04' },
        { id: 'lisn', title: 'Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model', completed: false, deadline: '2026-11-04' }
      ]
      const sorted = sortCandidatePrimaries(candidates, { todayStr })
      expect(sorted[0].id).toBe('prop')
      expect(sorted[1].id).toBe('lisn')
      expect(sorted[2].id).toBe('lor')
      expect(sorted[3].id).toBe('routine')
    })
  })

  describe('buildAlignedOrder', () => {
    it('matches tasks in directive order and fills remaining slots with candidates', () => {
      const tasks = [
        { id: 't-lisn', title: 'Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model' },
        { id: 't-prop', title: 'Draft 1-page conducted EMI paper proposal & research scope pitch' },
        { id: 't-extra', title: 'Extra Candidate 1' },
        { id: 't-other', title: 'Unrelated' }
      ]
      const candidates = [
        { id: 't-extra', title: 'Extra Candidate 1' },
        { id: 't-other', title: 'Unrelated' }
      ]

      const aligned = buildAlignedOrder(tasks, candidates, DEFAULT_AUDIT_PRIMARIES)
      expect(aligned).toHaveLength(3)
      expect(aligned[0].id).toBe('t-prop')
      expect(aligned[1].id).toBe('t-lisn')
      expect(aligned[2].id).toBe('t-extra')
    })
  })
})
