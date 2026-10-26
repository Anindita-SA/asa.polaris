# Polaris Architecture Deepening Plan (Phase 1)
## Candidate 2: Extract Pure Task Prioritization Domain Module (`agendaPrioritizer.js`)

### Context & Goal
During the Thermo-Nuclear Code Quality Review, we identified that `TodayAgendaWidget.jsx` has expanded to 865 lines, carrying pure domain logic (55 lines of fuzzy string matching, keyword scoring, duplicate localStorage parsing blocks, and custom directive ranking).

This plan extracts the pure prioritization domain logic into a deep, testable module: `src/lib/agendaPrioritizer.js`.

---

### Seam & Interface Design

#### Module: `src/lib/agendaPrioritizer.js`
```javascript
export const DEFAULT_AUDIT_PRIMARIES = [
  'Portfolio: Replace AI Product Sketches with Real ID Sketches',
  'Agri Solar Survey Paper: Phase 2 (Reading & Synthesis)',
  'DAB Converter & Power Electronics EMC Research (Dr. Vignesh Kumar)'
]

export function getAuditRank(task, auditList)
export function getStoredAuditList(todayStr)
export function sortCandidatePrimaries(candidates, options)
export function buildAlignedOrder(tasks, candidatePrimaries, auditList)
```

#### Consumer: `src/components/widgets/TodayAgendaWidget.jsx`
- Replaces inline algorithmic logic with direct module calls.
- Re-exports `DEFAULT_AUDIT_PRIMARIES` and `getAuditRank` to preserve 100% backward compatibility for all existing tests and imports.
- File length drops from 865 lines to ~720 lines, well below the 1,000-line warning threshold.

---

### Step-by-Step Execution Plan

1. **Create `src/lib/agendaPrioritizer.js`**:
   - Extract `DEFAULT_AUDIT_PRIMARIES` and `getAuditRank`.
   - Implement `getStoredAuditList(todayStr)` to eliminate duplicate `localStorage` parsing.
   - Implement `sortCandidatePrimaries(candidates, { savedOrder, auditList, todayStr })`.
   - Implement `buildAlignedOrder(tasks, candidatePrimaries, auditList)`.

2. **Refactor `src/components/widgets/TodayAgendaWidget.jsx`**:
   - Import the helpers from `../../lib/agendaPrioritizer`.
   - Re-export legacy functions for backward compatibility.
   - Simplify `useMemo` candidate sorting and `handleAlignAudit`.

3. **Create `src/lib/agendaPrioritizer.test.js`**:
   - Add unit tests for exact title match, fuzzy substring match, keyword heuristics, directive storage parsing, and candidate sorting.

4. **Run Verification Commands**:
   - `npx vitest run src/lib/agendaPrioritizer.test.js`
   - `npx vitest run src/components/widgets/TodayAgendaWidget.test.jsx`
   - `npm test` (all 35 suites)
   - `npm run build`
   - Scan for 0 em dashes, 0 en dashes, and 0 CSS gradients.

5. **Subagent Squad Quality Gates**:
   - Dispatch `ImplementationAuditor` to verify implementation.
   - Dispatch `SecurityAuditor` to verify security and multi-tenant isolation.
