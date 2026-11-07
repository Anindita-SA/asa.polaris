/**
 * scoutCategoryTracker.js
 * 3-Day Rolling Window Category Scout Tracker for Polaris.
 * Rotates Firecrawl and news ingestion to ensure balanced coverage across
 * the 6 canonical pillars over a rolling 3-day window.
 */

export const CANONICAL_CATEGORIES = [
  'Hardware, sensors & human-machine interface',
  'Food systems & agritech',
  'Nutrition science & wellbeing',
  'Tech & field implementation',
  'Marine & ocean conservation',
  'Community & grassroots ecology'
];

export const CATEGORY_KEYWORDS = {
  'Hardware, sensors & human-machine interface': [
    '"hardware"',
    '"sensors"',
    '"human-machine interface"',
    '"robotics"',
    '"power electronics"',
    '"embedded systems"'
  ],
  'Food systems & agritech': [
    '"agritech"',
    '"food systems"',
    '"sustainable agriculture"',
    '"vertical farming"',
    '"hydroponics"'
  ],
  'Nutrition science & wellbeing': [
    '"nutrition science"',
    '"wellbeing"',
    '"dietary science"',
    '"metabolic health"',
    '"preventive health"'
  ],
  'Tech & field implementation': [
    '"appropriate technology"',
    '"field deployment"',
    '"rural innovation"',
    '"open hardware"',
    '"conservation technology"'
  ],
  'Marine & ocean conservation': [
    '"marine conservation"',
    '"oceanography"',
    '"reef restoration"',
    '"blue carbon"',
    '"coastal ecology"'
  ],
  'Community & grassroots ecology': [
    '"grassroots ecology"',
    '"community conservation"',
    '"agroecology"',
    '"indigenous stewardship"',
    '"ecosystem restoration"'
  ]
};

/**
 * Parses a date string (YYYY-MM-DD) into UTC timestamp at midnight.
 */
function parseDateToUtcMidnight(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return Date.UTC(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return Date.UTC(year, month, day);
}

/**
 * Calculates rolling window status against a 3-day cycle.
 * @param {string|Date} windowStartDateStr - Window start date (YYYY-MM-DD)
 * @param {string|Date|null} todayStr - Current date (YYYY-MM-DD), defaults to today
 * @returns {{ isExpired: boolean, daysElapsed: number, cycleDay: number }}
 */
export function getRollingWindowStatus(windowStartDateStr, todayStr = null) {
  const windowUtc = parseDateToUtcMidnight(windowStartDateStr);
  const todayUtc = todayStr
    ? parseDateToUtcMidnight(todayStr)
    : parseDateToUtcMidnight(new Date().toISOString().slice(0, 10));

  if (windowUtc === null || todayUtc === null) {
    return {
      isExpired: false,
      daysElapsed: 0,
      cycleDay: 1
    };
  }

  const diffMs = todayUtc - windowUtc;
  const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = daysElapsed >= 3;
  const cycleDay = daysElapsed >= 3 ? 3 : daysElapsed + 1;

  return {
    isExpired,
    daysElapsed,
    cycleDay
  };
}

/**
 * Normalizes input counts into a record of all 6 canonical categories.
 */
function normalizeCategoryCounts(categoriesWithCounts) {
  const normalized = {};
  for (const cat of CANONICAL_CATEGORIES) {
    normalized[cat] = 0;
  }

  if (!categoriesWithCounts) return normalized;

  if (Array.isArray(categoriesWithCounts)) {
    for (const item of categoriesWithCounts) {
      if (!item) continue;
      const catName = item.category || item.name;
      const count = typeof item.fetch_count === 'number'
        ? item.fetch_count
        : (typeof item.count === 'number' ? item.count : 0);
      if (catName && normalized[catName] !== undefined) {
        normalized[catName] = count;
      }
    }
  } else if (typeof categoriesWithCounts === 'object') {
    for (const cat of CANONICAL_CATEGORIES) {
      if (typeof categoriesWithCounts[cat] === 'number') {
        normalized[cat] = categoriesWithCounts[cat];
      }
    }
  }

  return normalized;
}

/**
 * Extracts category names that share the minimum fetch count.
 * @param {Array|Object} categoriesWithCounts - Category count rows or mapping
 * @returns {string[]} Array of lowest-count canonical category names
 */
export function getLowestCountCategories(categoriesWithCounts) {
  const normalized = normalizeCategoryCounts(categoriesWithCounts);
  const counts = Object.values(normalized);
  const minCount = Math.min(...counts);

  return CANONICAL_CATEGORIES.filter(cat => normalized[cat] === minCount);
}

/**
 * Extracts keyword strings for targeted categories.
 */
function getCombinedKeywords(targetCategories) {
  const categories = (Array.isArray(targetCategories) && targetCategories.length > 0)
    ? targetCategories
    : CANONICAL_CATEGORIES;

  const keywordTerms = [];
  for (const cat of categories) {
    const list = CATEGORY_KEYWORDS[cat];
    if (list && list.length > 0) {
      keywordTerms.push(...list);
    } else {
      keywordTerms.push(`"${cat}"`);
    }
  }

  return keywordTerms.join(' OR ');
}

/**
 * Builds Firecrawl search query for scouting fellowship and grant opportunities.
 * @param {string[]} targetCategories - Prioritized canonical categories
 * @returns {string} Synthesized Firecrawl opportunity query
 */
export function buildFirecrawlOpportunityQuery(targetCategories) {
  const keywords = getCombinedKeywords(targetCategories);
  return `("fully funded" OR stipend OR paid) (fellowship OR grant OR "seed funding" OR "open call" OR internship) (${keywords}) 2026 2027 -newsletter -roundup`;
}

/**
 * Builds Firecrawl search query for scouting high-impact news stories.
 * @param {string[]} targetCategories - Prioritized canonical categories
 * @returns {string} Synthesized Firecrawl news query
 */
export function buildFirecrawlNewsQuery(targetCategories) {
  const keywords = getCombinedKeywords(targetCategories);
  return `(${keywords}) (breakthrough OR discovery OR research OR innovation OR deployment) 2026 -newsletter -roundup`;
}

/**
 * Normalizes any category string or alias to one of the 6 canonical categories.
 */
export function matchCanonicalCategory(categoryName) {
  if (!categoryName) return null;
  const s = String(categoryName).toLowerCase().trim();

  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.toLowerCase() === s) return cat;
  }

  if (s.includes('hardware') || s.includes('sensor') || s.includes('robot') || s.includes('embedded') || s.includes('human-machine')) {
    return 'Hardware, sensors & human-machine interface';
  }
  if (s.includes('food') || s.includes('agri') || s.includes('farm') || s.includes('crop') || s.includes('hydroponic')) {
    return 'Food systems & agritech';
  }
  if (s.includes('nutrition') || s.includes('wellbeing') || s.includes('diet') || s.includes('fitness') || s.includes('health')) {
    return 'Nutrition science & wellbeing';
  }
  if (s.includes('marine') || s.includes('ocean') || s.includes('coral') || s.includes('reef') || s.includes('coastal')) {
    return 'Marine & ocean conservation';
  }
  if (s.includes('grassroots') || s.includes('ecology') || s.includes('community') || s.includes('indigenous') || s.includes('forest')) {
    return 'Community & grassroots ecology';
  }
  if (s.includes('field') || s.includes('appropriate tech') || s.includes('engineering') || s.includes('rural') || s.includes('open hardware')) {
    return 'Tech & field implementation';
  }

  return null;
}

/**
 * Tallies newly ingested items into category counts.
 * @param {Array} items - List of items with category or pillar fields
 * @param {Object|Array} existingCounts - Existing counts object or rows
 * @returns {Record<string, number>} Updated category counts map
 */
export function calculateCategoryCounts(items = [], existingCounts = {}) {
  const counts = normalizeCategoryCounts(existingCounts);

  if (!Array.isArray(items)) return counts;

  for (const item of items) {
    if (!item) continue;
    const rawCategory = item.category || item.pillar || item.source_name;
    const canonical = matchCanonicalCategory(rawCategory);
    if (canonical && counts[canonical] !== undefined) {
      counts[canonical] += 1;
    }
  }

  return counts;
}
