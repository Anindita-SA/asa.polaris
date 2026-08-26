import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  computeWSJFScore, 
  calculateDeadlineUrgency, 
  calculateDurationScore 
} from './useWSJFScore';

describe('WSJF Scoring Math', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates deadline urgency correctly', () => {
    // Overdue or today
    expect(calculateDeadlineUrgency('2026-08-26')).toBe(4);
    expect(calculateDeadlineUrgency('2026-08-25')).toBe(4);
    
    // < 3 days away (27, 28)
    expect(calculateDeadlineUrgency('2026-08-27')).toBe(3);
    
    // 3-7 days away (29, 30, 31, 01, 02)
    expect(calculateDeadlineUrgency('2026-08-29')).toBe(2);
    expect(calculateDeadlineUrgency('2026-09-02')).toBe(2);
    
    // > 7 days away
    expect(calculateDeadlineUrgency('2026-09-03')).toBe(1);
    
    // No deadline
    expect(calculateDeadlineUrgency(null)).toBe(0);
  });

  it('calculates duration score correctly', () => {
    // Max 4 for <= 15 mins
    expect(calculateDurationScore(15)).toBe(4);
    // 30 mins = 0.5 hours -> 1 / 0.5 = 2
    expect(calculateDurationScore(30)).toBe(2);
    // 60 mins = 1 hour -> 1 / 1 = 1
    expect(calculateDurationScore(60)).toBe(1);
    // Missing duration -> neutral 1
    expect(calculateDurationScore(null)).toBe(1);
    expect(calculateDurationScore(0)).toBe(1);
  });

  it('computes total WSJF score correctly', () => {
    const task = {
      quadrant: 'urgent_important', // weight 4
      deadline: '2026-08-26',       // urgency 4
      estimated_minutes: 15         // duration 4
    };
    
    // Score = (4 * 0.4) + (4 * 0.35) + (4 * 0.25) = 1.6 + 1.4 + 1.0 = 4.0
    const result = computeWSJFScore(task);
    expect(result.score).toBe(4.0);
    expect(result.breakdown.quadrantWeight).toBe(4);
    expect(result.breakdown.deadlineUrgency).toBe(4);
    expect(result.breakdown.durationScore).toBe(4);
  });

  it('computes scores for unestimated backburner tasks', () => {
    const task = {
      quadrant: 'neither', // weight 1
      deadline: null,      // urgency 0
      estimated_minutes: null // duration 1
    };
    
    // Score = (1 * 0.4) + (0 * 0.35) + (1 * 0.25) = 0.4 + 0 + 0.25 = 0.65
    const result = computeWSJFScore(task);
    expect(result.score).toBe(0.65);
  });
});
