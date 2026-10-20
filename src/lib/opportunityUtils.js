/**
 * opportunityUtils.js
 * Utilities for formatting and mapping opportunity descriptions into structured breakdowns
 * (Program Overview, Strategic Fit & Eligibility, What's Offered)
 */

export function parseOpportunityBreakdown(opp) {
  if (!opp) {
    return {
      overview: 'No overview available.',
      fit: 'No strategic fit details provided.',
      offered: 'See program call for full award terms.'
    }
  }

  const rawFit = (opp.project_fit || opp.summary || '').trim()
  const offered = (opp.what_offered || '').trim() || 'See program call for full award terms.'

  // Check for explicit headers/labels if present
  const overviewMatch = rawFit.match(/(?:Program Overview|Overview)\s*:\s*([^]+?)(?=(?:Strategic Fit|Fit & Eligibility|Eligibility|What's Offered|What is Offered)\s*:|$)/i)
  const fitMatch = rawFit.match(/(?:Strategic Fit(?: & Eligibility)?|Eligibility)\s*:\s*([^]+?)(?=(?:What's Offered|What is Offered)\s*:|$)/i)

  if (overviewMatch || fitMatch) {
    return {
      overview: (overviewMatch ? overviewMatch[1] : rawFit).trim(),
      fit: (fitMatch ? fitMatch[1] : 'Direct alignment with applicant research, design, or technical profile.').trim(),
      offered
    }
  }

  // Sentence-based splitting: Sentence 1 is Program Overview; Sentence 2+ is Strategic Fit & Eligibility
  const sentences = rawFit.match(/[^.!?]+[.!?]+/g)

  if (sentences && sentences.length > 1) {
    const overview = sentences[0].trim()
    const fit = sentences.slice(1).map(s => s.trim()).join(' ')
    return {
      overview,
      fit,
      offered
    }
  }

  return {
    overview: rawFit || 'No program overview provided.',
    fit: rawFit ? 'Direct alignment with applicant research, design, or technical profile.' : 'No strategic fit details provided.',
    offered
  }
}

export function formatTwoSentenceSummary(text) {
  if (!text) return 'No summary provided.'
  const clean = text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()
  const sentences = clean.match(/[^.!?]+[.!?]+/g)
  if (sentences && sentences.length > 0) {
    return sentences.slice(0, 2).map(s => s.trim()).join(' ')
  }
  return clean
}
