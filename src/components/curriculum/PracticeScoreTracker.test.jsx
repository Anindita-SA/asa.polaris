// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PracticeScoreTracker, { 
  calculateBand, 
  roundToIeltsBand, 
  calculateOverallBand, 
  calculateModuleStats,
  extractScoreReportUrl,
  mergeScoresWithDefaults
} from './PracticeScoreTracker';
import { DEFAULT_IELTS_PRACTICE_SCORES } from '../../data/curriculumDefaults';
import { supabase } from '../../lib/supabase';


const mockUser = { id: 'user-ielts-123' };

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('PracticeScoreTracker - Band Calculation & Rounding Logic', () => {
  it('calculates official Listening band scores from raw score out of 40', () => {
    expect(calculateBand(40, 'listening', 40)).toBe(9.0);
    expect(calculateBand(39, 'listening', 40)).toBe(9.0);
    expect(calculateBand(38, 'listening', 40)).toBe(8.5);
    expect(calculateBand(37, 'listening', 40)).toBe(8.5);
    expect(calculateBand(36, 'listening', 40)).toBe(8.0);
    expect(calculateBand(35, 'listening', 40)).toBe(8.0);
    expect(calculateBand(34, 'listening', 40)).toBe(7.5);
    expect(calculateBand(32, 'listening', 40)).toBe(7.5);
    expect(calculateBand(31, 'listening', 40)).toBe(7.0);
    expect(calculateBand(30, 'listening', 40)).toBe(7.0);
    expect(calculateBand(29, 'listening', 40)).toBe(6.5);
    expect(calculateBand(26, 'listening', 40)).toBe(6.5);
    expect(calculateBand(25, 'listening', 40)).toBe(6.0);
    expect(calculateBand(23, 'listening', 40)).toBe(6.0);
    expect(calculateBand(22, 'listening', 40)).toBe(5.5);
    expect(calculateBand(18, 'listening', 40)).toBe(5.5);
    expect(calculateBand(17, 'listening', 40)).toBe(5.0);
    expect(calculateBand(16, 'listening', 40)).toBe(5.0);
    expect(calculateBand(15, 'listening', 40)).toBe(4.5);
    expect(calculateBand(13, 'listening', 40)).toBe(4.5);
    expect(calculateBand(12, 'listening', 40)).toBe(4.0);
    expect(calculateBand(10, 'listening', 40)).toBe(4.0);
    expect(calculateBand(9, 'listening', 40)).toBe(0.0);
  });

  it('calculates official Academic Reading band scores from raw score out of 40', () => {
    expect(calculateBand(40, 'reading', 40)).toBe(9.0);
    expect(calculateBand(39, 'reading', 40)).toBe(9.0);
    expect(calculateBand(38, 'reading', 40)).toBe(8.5);
    expect(calculateBand(37, 'reading', 40)).toBe(8.5);
    expect(calculateBand(36, 'reading', 40)).toBe(8.0);
    expect(calculateBand(35, 'reading', 40)).toBe(8.0);
    expect(calculateBand(34, 'reading', 40)).toBe(7.5);
    expect(calculateBand(33, 'reading', 40)).toBe(7.5);
    expect(calculateBand(32, 'reading', 40)).toBe(7.0);
    expect(calculateBand(30, 'reading', 40)).toBe(7.0);
    expect(calculateBand(29, 'reading', 40)).toBe(6.5);
    expect(calculateBand(27, 'reading', 40)).toBe(6.5);
    expect(calculateBand(26, 'reading', 40)).toBe(6.0);
    expect(calculateBand(23, 'reading', 40)).toBe(6.0);
    expect(calculateBand(22, 'reading', 40)).toBe(5.5);
    expect(calculateBand(19, 'reading', 40)).toBe(5.5);
    expect(calculateBand(18, 'reading', 40)).toBe(5.0);
    expect(calculateBand(15, 'reading', 40)).toBe(5.0);
    expect(calculateBand(14, 'reading', 40)).toBe(4.5);
    expect(calculateBand(13, 'reading', 40)).toBe(4.5);
    expect(calculateBand(12, 'reading', 40)).toBe(4.0);
    expect(calculateBand(10, 'reading', 40)).toBe(4.0);
    expect(calculateBand(9, 'reading', 40)).toBe(0.0);
  });

  it('handles direct band score input for writing and speaking', () => {
    expect(calculateBand(7.5, 'writing', null)).toBe(7.5);
    expect(calculateBand(8.0, 'speaking', null)).toBe(8.0);
    expect(calculateBand(6.5, 'writing', '')).toBe(6.5);
  });

  it('handles listening/reading direct band input when total is null and score <= 9.0', () => {
    expect(calculateBand(8.5, 'listening', null)).toBe(8.5);
    expect(calculateBand(7.0, 'reading', null)).toBe(7.0);
  });

  it('applies official IELTS overall band rounding rules', () => {
    // fraction < 0.25 -> round down to .0
    expect(roundToIeltsBand(6.125)).toBe(6.0);
    expect(roundToIeltsBand(7.0)).toBe(7.0);
    expect(roundToIeltsBand(7.20)).toBe(7.0);

    // 0.25 <= fraction < 0.75 -> round to .5
    expect(roundToIeltsBand(6.25)).toBe(6.5);
    expect(roundToIeltsBand(6.375)).toBe(6.5);
    expect(roundToIeltsBand(6.5)).toBe(6.5);
    expect(roundToIeltsBand(6.625)).toBe(6.5);
    expect(roundToIeltsBand(7.4)).toBe(7.5);

    // fraction >= 0.75 -> round up to next whole band
    expect(roundToIeltsBand(6.75)).toBe(7.0);
    expect(roundToIeltsBand(6.875)).toBe(7.0);
    expect(roundToIeltsBand(7.75)).toBe(8.0);
    expect(roundToIeltsBand(8.875)).toBe(9.0);
  });

  it('calculates overall band correctly across active modules', () => {
    const averages = {
      listening: 7.5,
      reading: 8.0,
      writing: 7.0,
      speaking: 7.5,
    };
    const overall = calculateOverallBand(averages);
    expect(overall.activeCount).toBe(4);
    expect(overall.rawMean).toBe(7.5);
    expect(overall.roundedBand).toBe(7.5);
  });
});

describe('PracticeScoreTracker - Sub-3-Test Floor Trend Logic', () => {
  it('handles 0 tests (No data yet)', () => {
    const stats = calculateModuleStats([], 'listening');
    expect(stats.count).toBe(0);
    expect(stats.average).toBeNull();
    expect(stats.best).toBeNull();
    expect(stats.trendType).toBe('none');
    expect(stats.trendText).toBe('No data yet');
  });

  it('handles 1 test (Baseline)', () => {
    const scores = [
      { category: 'listening', score: 35, total: 40, band: 8.0, date: '2026-09-01T00:00:00Z' }
    ];
    const stats = calculateModuleStats(scores, 'listening');
    expect(stats.count).toBe(1);
    expect(stats.average).toBe(8.0);
    expect(stats.best).toBe(8.0);
    expect(stats.trendType).toBe('baseline');
    expect(stats.trendText).toBe('Baseline (1 test)');
  });

  it('handles 2 tests with direct comparison (+delta, -delta, stable)', () => {
    // Upward
    const upScores = [
      { category: 'reading', score: 27, total: 40, band: 6.5, date: '2026-09-01T00:00:00Z' },
      { category: 'reading', score: 33, total: 40, band: 7.5, date: '2026-09-02T00:00:00Z' }
    ];
    const upStats = calculateModuleStats(upScores, 'reading');
    expect(upStats.count).toBe(2);
    expect(upStats.average).toBe(7.0);
    expect(upStats.best).toBe(7.5);
    expect(upStats.trendType).toBe('up');
    expect(upStats.trendText).toBe('+1.0 vs Test 1');

    // Downward
    const downScores = [
      { category: 'writing', score: 7.5, total: null, band: 7.5, date: '2026-09-01T00:00:00Z' },
      { category: 'writing', score: 7.0, total: null, band: 7.0, date: '2026-09-02T00:00:00Z' }
    ];
    const downStats = calculateModuleStats(downScores, 'writing');
    expect(downStats.trendType).toBe('down');
    expect(downStats.trendText).toBe('-0.5 vs Test 1');

    // Stable
    const stableScores = [
      { category: 'speaking', score: 7.0, total: null, band: 7.0, date: '2026-09-01T00:00:00Z' },
      { category: 'speaking', score: 7.0, total: null, band: 7.0, date: '2026-09-02T00:00:00Z' }
    ];
    const stableStats = calculateModuleStats(stableScores, 'speaking');
    expect(stableStats.trendType).toBe('stable');
    expect(stableStats.trendText).toBe('Stable (2 tests)');
  });

  it('handles 3+ tests with rolling recent vs baseline average', () => {
    const scores = [
      { category: 'listening', score: 23, total: 40, band: 6.0, date: '2026-09-01T00:00:00Z' },
      { category: 'listening', score: 23, total: 40, band: 6.0, date: '2026-09-02T00:00:00Z' },
      { category: 'listening', score: 30, total: 40, band: 7.0, date: '2026-09-03T00:00:00Z' },
      { category: 'listening', score: 32, total: 40, band: 7.5, date: '2026-09-04T00:00:00Z' },
      { category: 'listening', score: 35, total: 40, band: 8.0, date: '2026-09-05T00:00:00Z' },
    ];
    const stats = calculateModuleStats(scores, 'listening');
    expect(stats.count).toBe(5);
    expect(stats.best).toBe(8.0);
    expect(stats.trendType).toBe('up');
    expect(stats.trendText).toBe('+1.5 vs baseline');
  });
});

describe('PracticeScoreTracker - mergeScoresWithDefaults Helper', () => {
  it('merging into empty array returns all default tests', () => {
    const result = mergeScoresWithDefaults([]);
    expect(result.length).toBe(DEFAULT_IELTS_PRACTICE_SCORES.length);
    expect(result.some(s => s.id === 'ielts-mock-listen-2')).toBe(true);
    expect(result.some(s => s.id === 'ielts-mock-listen-1')).toBe(true);
    expect(result.some(s => s.id === 'ielts-mock-read-4')).toBe(true);
    expect(result.some(s => s.id === 'ielts-mock-read-3')).toBe(true);
    expect(result.some(s => s.id === 'ielts-mock-read-2')).toBe(true);
    expect(result.some(s => s.id === 'ielts-mock-read-1')).toBe(true);
  });

  it('merging into null or undefined returns all default tests', () => {
    expect(mergeScoresWithDefaults(null).length).toBe(DEFAULT_IELTS_PRACTICE_SCORES.length);
    expect(mergeScoresWithDefaults(undefined).length).toBe(DEFAULT_IELTS_PRACTICE_SCORES.length);
  });

  it('merging into existing user tests preserves user tests AND includes missing default tests', () => {
    const customUserTests = [
      {
        id: 'user-writing-1',
        title: 'Task 1 Academic Graph Description',
        category: 'writing',
        score: 7.0,
        band: 7.0,
        date: '2026-09-18T10:00:00Z'
      },
      {
        id: 'user-writing-2',
        title: 'Task 2 Essay on Renewable Energy',
        category: 'writing',
        score: 7.5,
        band: 7.5,
        date: '2026-09-19T10:00:00Z'
      },
      {
        id: 'user-speaking-1',
        title: 'Speaking Part 2 Cue Card',
        category: 'speaking',
        score: 8.0,
        band: 8.0,
        date: '2026-09-20T10:00:00Z'
      }
    ];

    const result = mergeScoresWithDefaults(customUserTests);
    expect(result.length).toBe(3 + DEFAULT_IELTS_PRACTICE_SCORES.length);

    // Preserves custom user tests
    expect(result.find(s => s.id === 'user-writing-1')).toBeTruthy();
    expect(result.find(s => s.id === 'user-writing-2')).toBeTruthy();
    expect(result.find(s => s.id === 'user-speaking-1')).toBeTruthy();

    // Includes all 6 default tests
    expect(result.filter(s => s.category === 'reading').length).toBe(4);
    expect(result.filter(s => s.category === 'listening').length).toBe(2);

    // Sorted descending by date
    for (let i = 0; i < result.length - 1; i++) {
      const dateA = new Date(result[i].date || result[i].created_at || 0).getTime();
      const dateB = new Date(result[i + 1].date || result[i + 1].created_at || 0).getTime();
      expect(dateA).toBeGreaterThanOrEqual(dateB);
    }
  });

  it('merging when defaults already exist does not duplicate items', () => {
    const existingDefaults = [...DEFAULT_IELTS_PRACTICE_SCORES];
    const result = mergeScoresWithDefaults(existingDefaults);
    expect(result.length).toBe(DEFAULT_IELTS_PRACTICE_SCORES.length);
  });

  it('matches existing tests by title or key substrings to prevent duplicate recovery', () => {
    const existingMatches = [
      {
        id: 'supabase-custom-id-1',
        title: 'Mock Test 2026 January Listening Practice',
        category: 'listening',
        score: 38,
        total: 40,
        band: 8.5,
        date: '2026-09-10T10:00:00Z'
      },
      {
        id: 'supabase-custom-id-2',
        title: 'IELTS Listening Practice Test 201',
        category: 'listening',
        score: 38,
        total: 40,
        band: 8.5,
        date: '2026-09-08T10:00:00Z'
      },
      {
        id: 'supabase-custom-id-3',
        title: 'IELTS Reading Practice Test 313',
        category: 'reading',
        score: 36,
        total: 40,
        band: 8.0,
        date: '2026-09-06T10:00:00Z'
      },
      {
        id: 'supabase-custom-id-4',
        title: 'IELTS Reading Practice Test 312',
        category: 'reading',
        score: 35,
        total: 40,
        band: 8.0,
        date: '2026-09-04T10:00:00Z'
      },
      {
        id: 'supabase-custom-id-5',
        title: 'IELTS Reading Practice Test 311',
        category: 'reading',
        score: 35,
        total: 40,
        band: 8.0,
        date: '2026-09-02T10:00:00Z'
      },
      {
        id: 'supabase-custom-id-6',
        title: 'IELTS Reading Practice Test 310',
        category: 'reading',
        score: 34,
        total: 40,
        band: 7.5,
        date: '2026-08-30T10:00:00Z'
      }
    ];

    const result = mergeScoresWithDefaults(existingMatches);
    expect(result.length).toBe(6);
  });
});

describe('PracticeScoreTracker - Component UI, Persistence & Migration', () => {
  const sampleScores = [
    {
      id: 'score-1',
      user_id: 'user-ielts-123',
      curriculum_id: 'curr-ielts-2026',
      title: 'Cambridge 18 Test 1 Listening',
      category: 'listening',
      score: 35,
      total: 40,
      band: 8.0,
      date: '2026-09-10T10:00:00Z',
      created_at: '2026-09-10T10:00:00Z'
    },
    {
      id: 'score-2',
      user_id: 'user-ielts-123',
      curriculum_id: 'curr-ielts-2026',
      title: 'Cambridge 18 Test 1 Reading',
      category: 'reading',
      score: 33,
      total: 40,
      band: 7.5,
      date: '2026-09-11T10:00:00Z',
      created_at: '2026-09-11T10:00:00Z'
    },
    {
      id: 'score-3',
      user_id: 'user-ielts-123',
      curriculum_id: 'curr-ielts-2026',
      title: 'Writing Task 2 Academic Essay',
      category: 'writing',
      score: 7.0,
      total: null,
      band: 7.0,
      date: '2026-09-12T10:00:00Z',
      created_at: '2026-09-12T10:00:00Z'
    },
    {
      id: 'score-4',
      user_id: 'user-ielts-123',
      curriculum_id: 'curr-ielts-2026',
      title: 'Speaking Mock Interview',
      category: 'speaking',
      score: 7.5,
      total: null,
      band: 7.5,
      date: '2026-09-13T10:00:00Z',
      created_at: '2026-09-13T10:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: sampleScores, error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 'score-new',
            user_id: 'user-ielts-123',
            curriculum_id: 'curr-ielts-2026',
            title: 'New Mock Test',
            category: 'listening',
            score: 37,
            total: 40,
            band: 8.5,
            date: '2026-09-14T12:00:00Z'
          }],
          error: null
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('renders executive summary cards and module stats correctly', async () => {
    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(screen.getByText('IELTS Module Average Bands & Score Predictor')).toBeTruthy();
    });

    // 4 tests logged across 4 skills -> Overall band should be (8.0 + 7.5 + 7.0 + 7.5)/4 = 7.5
    expect(screen.getByText('Projected Overall')).toBeTruthy();
    expect(screen.getByText('Target Met (7.5+)')).toBeTruthy();

    // Module cards
    expect(screen.getAllByText('Listening').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reading').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Writing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Speaking').length).toBeGreaterThan(0);

    // Progression strip heading
    expect(screen.getByText('Chronological Progression Strip')).toBeTruthy();
  });

  it('filters tests and progression when module tabs are clicked', async () => {
    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(screen.getAllByText('Cambridge 18 Test 1 Listening').length).toBeGreaterThan(0);
    });

    // Click Reading tab
    const readingTab = screen.getByRole('button', { name: /reading/i });
    fireEvent.click(readingTab);

    expect(screen.getAllByText('Cambridge 18 Test 1 Reading').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cambridge 18 Test 1 Listening')).toBeNull();
  });

  it('auto-migrates legacy localStorage scores to Supabase on mount', async () => {
    const legacyScores = [
      {
        id: 'legacy-1',
        title: 'Legacy Test 1',
        category: 'listening',
        score: 30,
        total: 40,
        date: '2026-08-01T00:00:00Z'
      }
    ];
    localStorage.setItem('polaris_practice_scores_curr-ielts-2026', JSON.stringify(legacyScores));

    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('practice_scores');
    });

    // Verify legacy item was cleared after migration
    expect(localStorage.getItem('polaris_practice_scores_curr-ielts-2026')).toBeNull();
  });

  it('submits a new practice score log and updates both state and localStorage immediately', async () => {
    const cacheKey = 'polaris_practice_scores_cache_user-ielts-123_curr-ielts-2026';
    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Cambridge Book 18/)).toBeTruthy();
    });

    const titleInput = screen.getByPlaceholderText(/Cambridge Book 18/);
    const scoreInput = screen.getByPlaceholderText('35');
    const submitBtn = screen.getByRole('button', { name: /Log Score/i });

    fireEvent.change(titleInput, { target: { value: 'Cambridge 19 Test 1' } });
    fireEvent.change(scoreInput, { target: { value: '37' } });
    fireEvent.click(submitBtn);

    // State is updated immediately
    expect(screen.getAllByText('Cambridge 19 Test 1').length).toBeGreaterThan(0);

    // Local storage is updated immediately
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    expect(cached.some(s => s.title === 'Cambridge 19 Test 1')).toBe(true);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('practice_scores');
    });
  });

  it('handles score deletion on trash click and updates both state and localStorage immediately', async () => {
    const cacheKey = 'polaris_practice_scores_cache_user-ielts-123_curr-ielts-2026';
    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(screen.getAllByText('Speaking Mock Interview').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete test log');
    expect(deleteButtons.length).toBeGreaterThan(0);

    fireEvent.click(deleteButtons[0]);

    // Speaking Mock Interview removed from view
    expect(screen.queryAllByText('Speaking Mock Interview').length).toBe(0);

    // Local storage updated immediately
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    expect(cached.some(s => s.title === 'Speaking Mock Interview')).toBe(false);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('practice_scores');
    });
  });

  it('extractScoreReportUrl correctly extracts URLs from item.url or item.title', () => {
    expect(extractScoreReportUrl({ url: 'https://ieltsonlinetests.com/score/60136001' })).toBe('https://ieltsonlinetests.com/score/60136001');
    expect(extractScoreReportUrl({ title: 'Mock Test https://ieltsonlinetests.com/score/12345' })).toBe('https://ieltsonlinetests.com/score/12345');
    expect(extractScoreReportUrl({ title: 'Mock Test without URL' })).toBeNull();
    expect(extractScoreReportUrl(null)).toBeNull();
    expect(extractScoreReportUrl({ url: 'javascript:alert(1)' })).toBeNull();
  });

  it('initializes and seeds DEFAULT_IELTS_PRACTICE_SCORES when cache and database are empty', async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: DEFAULT_IELTS_PRACTICE_SCORES,
          error: null
        })
      })
    }));

    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(screen.getAllByText('IELTS Online Tests - Mock Test 2026 January Listening Test 1').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('IELTS Listening Practice Test 201').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 313').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 312').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 311').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 310').length).toBeGreaterThan(0);

    // Check that external link chip is rendered for items with URL
    const scoreReportLinks = screen.getAllByRole('link', { name: /Score Report/i });
    expect(scoreReportLinks.length).toBeGreaterThan(0);
    expect(scoreReportLinks[0].getAttribute('href')).toBe('https://ieltsonlinetests.com/score/60136001');

    // Verify localStorage cache was populated
    const cached = JSON.parse(localStorage.getItem('polaris_practice_scores_cache_user-ielts-123_curr-ielts-2026'));
    expect(cached.length).toBe(6);
  });

  it('submits a new practice score log with optional URL', async () => {
    let insertedPayload = null;
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: sampleScores, error: null }),
      insert: vi.fn().mockImplementation((payload) => {
        insertedPayload = payload;
        return {
          select: vi.fn().mockResolvedValue({
            data: [{
              id: 'score-new-url',
              user_id: 'user-ielts-123',
              curriculum_id: 'curr-ielts-2026',
              title: 'Online Mock Test 2',
              category: 'reading',
              score: 38,
              total: 40,
              band: 8.5,
              url: 'https://ieltsonlinetests.com/score/99999',
              date: '2026-09-15T12:00:00Z'
            }],
            error: null
          })
        };
      })
    }));

    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Cambridge Book 18/)).toBeTruthy();
    });

    const titleInput = screen.getByPlaceholderText(/Cambridge Book 18/);
    const scoreInput = screen.getByPlaceholderText('35');
    const urlInput = screen.getByPlaceholderText(/ieltsonlinetests\.com\/score/);
    const submitBtn = screen.getByRole('button', { name: /Log Score/i });

    fireEvent.change(titleInput, { target: { value: 'Online Mock Test 2' } });
    fireEvent.change(scoreInput, { target: { value: '38' } });
    fireEvent.change(urlInput, { target: { value: 'https://ieltsonlinetests.com/score/99999' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertedPayload).toBeTruthy();
    });

    expect(insertedPayload[0].url).toBe('https://ieltsonlinetests.com/score/99999');
    expect(insertedPayload[0].title).toBe('Online Mock Test 2');
  });

  it('synchronously loads DEFAULT_IELTS_PRACTICE_SCORES on initial render when localStorage is empty', () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(new Promise(() => {}))
    }));

    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    expect(screen.getAllByText('IELTS Reading Practice Test 313').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 312').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 311').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 310').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Listening Practice Test 201').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Online Tests - Mock Test 2026 January Listening Test 1').length).toBeGreaterThan(0);
    expect(screen.getByText('6 Tests Logged')).toBeTruthy();
  });

  it('synchronously merges DEFAULT_IELTS_PRACTICE_SCORES into pre-existing custom cached tests on frame 0', () => {
    const customUserWritingScores = [
      {
        id: 'user-w1',
        title: 'Writing Task 1 Process Diagram',
        category: 'writing',
        score: 7.0,
        total: null,
        band: 7.0,
        date: '2026-09-15T09:00:00Z'
      },
      {
        id: 'user-w2',
        title: 'Writing Task 2 Technology Essay',
        category: 'writing',
        score: 7.5,
        total: null,
        band: 7.5,
        date: '2026-09-16T09:00:00Z'
      },
      {
        id: 'user-w3',
        title: 'Writing Task 2 Education Essay',
        category: 'writing',
        score: 7.5,
        total: null,
        band: 7.5,
        date: '2026-09-17T09:00:00Z'
      }
    ];

    const cacheKey = 'polaris_practice_scores_cache_user-ielts-123_curr-ielts-2026';
    localStorage.setItem(cacheKey, JSON.stringify(customUserWritingScores));

    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(new Promise(() => {}))
    }));

    render(<PracticeScoreTracker curriculumId="curr-ielts-2026" />);

    // Custom writing tests appear immediately on frame 0
    expect(screen.getAllByText('Writing Task 1 Process Diagram').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Writing Task 2 Technology Essay').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Writing Task 2 Education Essay').length).toBeGreaterThan(0);

    // Default reading tests (4 tests) and listening tests (2 tests) appear immediately on frame 0
    expect(screen.getAllByText('IELTS Reading Practice Test 313').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 312').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 311').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Reading Practice Test 310').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Listening Practice Test 201').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Online Tests - Mock Test 2026 January Listening Test 1').length).toBeGreaterThan(0);

    // Reading module card should show 4 tests and Listening module card should show 2 tests
    expect(screen.getByText('9 Tests Logged')).toBeTruthy();
    expect(screen.getByText('4 tests')).toBeTruthy();
    expect(screen.getByText('2 tests')).toBeTruthy();
    expect(screen.getByText('3 tests')).toBeTruthy();

    // Verify localStorage cache was updated synchronously with the merged 9 tests
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    expect(cached.length).toBe(9);
  });
});

