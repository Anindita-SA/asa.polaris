import { describe, it, expect } from 'vitest'
import { parseOpportunityBreakdown, formatTwoSentenceSummary } from './opportunityUtils'

describe('opportunityUtils', () => {
  it('parses multi-sentence project_fit into overview and fit cleanly', () => {
    const opp = {
      project_fit: 'Global research fellowship supporting early-career scientists and practitioners working on coastal wetlands in the Indo-Pacific region. Bangladeshi nationals are eligible to apply with independent research proposals.',
      what_offered: 'Up to $60,000 research grant covering field equipment and travel stipend.'
    }

    const breakdown = parseOpportunityBreakdown(opp)
    expect(breakdown.overview).toBe('Global research fellowship supporting early-career scientists and practitioners working on coastal wetlands in the Indo-Pacific region.')
    expect(breakdown.fit).toBe('Bangladeshi nationals are eligible to apply with independent research proposals.')
    expect(breakdown.offered).toBe('Up to $60,000 research grant covering field equipment and travel stipend.')
  })

  it('handles explicit section headers in project_fit', () => {
    const opp = {
      project_fit: 'Overview: Preeminent European Master in Sustainable Transportation. Strategic Fit: Direct 100% alignment with power electronics research.',
      what_offered: 'Full tuition waiver + €1,400/month living stipend.'
    }

    const breakdown = parseOpportunityBreakdown(opp)
    expect(breakdown.overview).toBe('Preeminent European Master in Sustainable Transportation.')
    expect(breakdown.fit).toBe('Direct 100% alignment with power electronics research.')
    expect(breakdown.offered).toBe('Full tuition waiver + €1,400/month living stipend.')
  })

  it('provides safe fallbacks for empty or null inputs', () => {
    const emptyBreakdown = parseOpportunityBreakdown(null)
    expect(emptyBreakdown.overview).toBe('No overview available.')
    expect(emptyBreakdown.fit).toBe('No strategic fit details provided.')
    expect(emptyBreakdown.offered).toBe('See program call for full award terms.')

    const singleSentenceOpp = {
      project_fit: 'Open call for creative technology prototypes in rural agriculture.',
      what_offered: ''
    }
    const singleBreakdown = parseOpportunityBreakdown(singleSentenceOpp)
    expect(singleBreakdown.overview).toBe('Open call for creative technology prototypes in rural agriculture.')
    expect(singleBreakdown.fit).toBe('Direct alignment with applicant research, design, or technical profile.')
    expect(singleBreakdown.offered).toBe('See program call for full award terms.')
  })

  it('formats two sentence summaries properly', () => {
    const longText = 'Sentence one here. Sentence two follows it. Sentence three should be dropped. Sentence four.'
    expect(formatTwoSentenceSummary(longText)).toBe('Sentence one here. Sentence two follows it.')
    expect(formatTwoSentenceSummary('')).toBe('No summary provided.')
  })
})
