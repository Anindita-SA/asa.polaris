import { describe, it, expect } from 'vitest';
import {
  CANONICAL_CATEGORIES,
  CATEGORY_KEYWORDS,
  getRollingWindowStatus,
  getLowestCountCategories,
  buildFirecrawlOpportunityQuery,
  buildFirecrawlNewsQuery,
  calculateCategoryCounts,
  matchCanonicalCategory
} from './scoutCategoryTracker';

describe('scoutCategoryTracker', () => {
  describe('CANONICAL_CATEGORIES & CATEGORY_KEYWORDS', () => {
    it('defines exactly the 6 canonical categories', () => {
      expect(CANONICAL_CATEGORIES).toHaveLength(6);
      expect(CANONICAL_CATEGORIES).toContain('Hardware, sensors & human-machine interface');
      expect(CANONICAL_CATEGORIES).toContain('Food systems & agritech');
      expect(CANONICAL_CATEGORIES).toContain('Nutrition science & wellbeing');
      expect(CANONICAL_CATEGORIES).toContain('Tech & field implementation');
      expect(CANONICAL_CATEGORIES).toContain('Marine & ocean conservation');
      expect(CANONICAL_CATEGORIES).toContain('Community & grassroots ecology');
    });

    it('has keywords defined for every canonical category', () => {
      for (const cat of CANONICAL_CATEGORIES) {
        expect(CATEGORY_KEYWORDS[cat]).toBeDefined();
        expect(Array.isArray(CATEGORY_KEYWORDS[cat])).toBe(true);
        expect(CATEGORY_KEYWORDS[cat].length).toBeGreaterThan(0);
      }
    });
  });

  describe('getRollingWindowStatus', () => {
    it('returns cycleDay 1 and not expired on day 0', () => {
      const status = getRollingWindowStatus('2026-11-07', '2026-11-07');
      expect(status.isExpired).toBe(false);
      expect(status.daysElapsed).toBe(0);
      expect(status.cycleDay).toBe(1);
    });

    it('returns cycleDay 2 and not expired on day 1', () => {
      const status = getRollingWindowStatus('2026-11-06', '2026-11-07');
      expect(status.isExpired).toBe(false);
      expect(status.daysElapsed).toBe(1);
      expect(status.cycleDay).toBe(2);
    });

    it('returns cycleDay 3 and not expired on day 2', () => {
      const status = getRollingWindowStatus('2026-11-05', '2026-11-07');
      expect(status.isExpired).toBe(false);
      expect(status.daysElapsed).toBe(2);
      expect(status.cycleDay).toBe(3);
    });

    it('marks window as expired when 3 or more days have elapsed', () => {
      const status = getRollingWindowStatus('2026-11-04', '2026-11-07');
      expect(status.isExpired).toBe(true);
      expect(status.daysElapsed).toBe(3);
      expect(status.cycleDay).toBe(3);

      const statusOlder = getRollingWindowStatus('2026-11-01', '2026-11-07');
      expect(statusOlder.isExpired).toBe(true);
      expect(statusOlder.daysElapsed).toBe(6);
    });

    it('gracefully handles missing or invalid date inputs', () => {
      const status = getRollingWindowStatus(null);
      expect(status.isExpired).toBe(false);
      expect(status.daysElapsed).toBe(0);
      expect(status.cycleDay).toBe(1);
    });
  });

  describe('getLowestCountCategories', () => {
    it('returns all categories when all counts are zero', () => {
      const targets = getLowestCountCategories([]);
      expect(targets).toEqual(CANONICAL_CATEGORIES);
    });

    it('identifies lowest count categories from array of objects', () => {
      const rows = [
        { category: 'Hardware, sensors & human-machine interface', fetch_count: 2 },
        { category: 'Food systems & agritech', fetch_count: 0 },
        { category: 'Nutrition science & wellbeing', fetch_count: 1 },
        { category: 'Tech & field implementation', fetch_count: 3 },
        { category: 'Marine & ocean conservation', fetch_count: 0 },
        { category: 'Community & grassroots ecology', fetch_count: 1 }
      ];

      const targets = getLowestCountCategories(rows);
      expect(targets).toEqual([
        'Food systems & agritech',
        'Marine & ocean conservation'
      ]);
    });

    it('identifies lowest count categories from object record', () => {
      const map = {
        'Hardware, sensors & human-machine interface': 1,
        'Food systems & agritech': 1,
        'Nutrition science & wellbeing': 2,
        'Tech & field implementation': 1,
        'Marine & ocean conservation': 3,
        'Community & grassroots ecology': 2
      };

      const targets = getLowestCountCategories(map);
      expect(targets).toEqual([
        'Hardware, sensors & human-machine interface',
        'Food systems & agritech',
        'Tech & field implementation'
      ]);
    });

    it('treats missing canonical categories as count zero', () => {
      const partial = [
        { category: 'Hardware, sensors & human-machine interface', fetch_count: 2 }
      ];
      const targets = getLowestCountCategories(partial);
      expect(targets).toHaveLength(5);
      expect(targets).not.toContain('Hardware, sensors & human-machine interface');
    });
  });

  describe('buildFirecrawlOpportunityQuery', () => {
    it('builds query with specified category keywords', () => {
      const query = buildFirecrawlOpportunityQuery(['Food systems & agritech']);
      expect(query).toContain('("fully funded" OR stipend OR paid)');
      expect(query).toContain('(fellowship OR grant OR "seed funding" OR "open call" OR internship)');
      expect(query).toContain('"agritech"');
      expect(query).toContain('"sustainable agriculture"');
      expect(query).toContain('2026 2027 -newsletter -roundup');
    });

    it('falls back to all canonical keywords if targets is empty', () => {
      const query = buildFirecrawlOpportunityQuery([]);
      expect(query).toContain('"hardware"');
      expect(query).toContain('"marine conservation"');
      expect(query).toContain('2026 2027 -newsletter -roundup');
    });
  });

  describe('buildFirecrawlNewsQuery', () => {
    it('builds news query with specified category keywords', () => {
      const query = buildFirecrawlNewsQuery(['Marine & ocean conservation']);
      expect(query).toContain('"marine conservation"');
      expect(query).toContain('"oceanography"');
      expect(query).toContain('(breakthrough OR discovery OR research OR innovation OR deployment)');
      expect(query).toContain('2026 -newsletter -roundup');
    });
  });

  describe('matchCanonicalCategory', () => {
    it('matches exact canonical categories', () => {
      expect(matchCanonicalCategory('Food systems & agritech')).toBe('Food systems & agritech');
    });

    it('matches aliases and keywords', () => {
      expect(matchCanonicalCategory('Robotics and Sensors')).toBe('Hardware, sensors & human-machine interface');
      expect(matchCanonicalCategory('Oceanography Research')).toBe('Marine & ocean conservation');
      expect(matchCanonicalCategory('Diet and Metabolic Health')).toBe('Nutrition science & wellbeing');
      expect(matchCanonicalCategory('Forest Restoration')).toBe('Community & grassroots ecology');
      expect(matchCanonicalCategory('Rural Appropriate Technology')).toBe('Tech & field implementation');
    });

    it('returns null for unknown category strings', () => {
      expect(matchCanonicalCategory('Cryptocurrency Trading')).toBeNull();
    });
  });

  describe('calculateCategoryCounts', () => {
    it('tallies items accurately into category counts', () => {
      const items = [
        { category: 'Hardware, sensors & human-machine interface' },
        { pillar: 'Food systems & agritech' },
        { category: 'Robotics' },
        { category: 'Marine & ocean conservation' }
      ];

      const counts = calculateCategoryCounts(items);
      expect(counts['Hardware, sensors & human-machine interface']).toBe(2);
      expect(counts['Food systems & agritech']).toBe(1);
      expect(counts['Marine & ocean conservation']).toBe(1);
      expect(counts['Nutrition science & wellbeing']).toBe(0);
      expect(counts['Tech & field implementation']).toBe(0);
      expect(counts['Community & grassroots ecology']).toBe(0);
    });

    it('accumulates counts on top of existing counts', () => {
      const existing = {
        'Hardware, sensors & human-machine interface': 1,
        'Food systems & agritech': 2
      };
      const items = [{ category: 'Food systems & agritech' }];
      const counts = calculateCategoryCounts(items, existing);
      expect(counts['Food systems & agritech']).toBe(3);
      expect(counts['Hardware, sensors & human-machine interface']).toBe(1);
    });
  });
});
