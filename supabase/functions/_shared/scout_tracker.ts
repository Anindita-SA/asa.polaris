/**
 * scout_tracker.ts
 * Shared 3-day rolling window category tracking utilities for Supabase Edge Functions.
 * Zero en dashes, zero em dashes.
 */

export const CANONICAL_CATEGORIES = [
  'Hardware, sensors & human-machine interface',
  'Food systems & agritech',
  'Nutrition science & wellbeing',
  'Tech & field implementation',
  'Marine & ocean conservation',
  'Community & grassroots ecology'
] as const;

export type CanonicalCategory = typeof CANONICAL_CATEGORIES[number];

export const CATEGORY_KEYWORDS: Record<CanonicalCategory, string[]> = {
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

export function parseDateToUtcMidnight(dateStr: string | Date | null | undefined): number | null {
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

export function getRollingWindowStatus(
  windowStartDateStr: string | Date | null | undefined,
  todayStr: string | Date | null | undefined = null
): { isExpired: boolean; daysElapsed: number; cycleDay: number } {
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

export function getLowestCountCategories(
  categoriesWithCounts: Array<{ category: string; fetch_count?: number }> | Record<string, number>
): string[] {
  const normalized: Record<string, number> = {};
  for (const cat of CANONICAL_CATEGORIES) {
    normalized[cat] = 0;
  }

  if (Array.isArray(categoriesWithCounts)) {
    for (const item of categoriesWithCounts) {
      if (!item) continue;
      const count = typeof item.fetch_count === 'number' ? item.fetch_count : 0;
      if (item.category && normalized[item.category] !== undefined) {
        normalized[item.category] = count;
      }
    }
  } else if (typeof categoriesWithCounts === 'object' && categoriesWithCounts !== null) {
    for (const cat of CANONICAL_CATEGORIES) {
      if (typeof (categoriesWithCounts as any)[cat] === 'number') {
        normalized[cat] = (categoriesWithCounts as any)[cat];
      }
    }
  }

  const counts = Object.values(normalized);
  const minCount = Math.min(...counts);

  return CANONICAL_CATEGORIES.filter(cat => normalized[cat] === minCount);
}

export function buildFirecrawlOpportunityQuery(targetCategories: string[]): string {
  const categories = (Array.isArray(targetCategories) && targetCategories.length > 0)
    ? targetCategories
    : [...CANONICAL_CATEGORIES];

  const keywordTerms: string[] = [];
  for (const cat of categories) {
    const list = CATEGORY_KEYWORDS[cat as CanonicalCategory];
    if (list && list.length > 0) {
      keywordTerms.push(...list);
    } else {
      keywordTerms.push(`"${cat}"`);
    }
  }

  const keywordsGroup = keywordTerms.join(' OR ');
  return `("fully funded" OR stipend OR paid) (fellowship OR grant OR "seed funding" OR "open call" OR internship) (${keywordsGroup}) 2026 2027 -newsletter -roundup`;
}

export function buildFirecrawlNewsQuery(targetCategories: string[]): string {
  const categories = (Array.isArray(targetCategories) && targetCategories.length > 0)
    ? targetCategories
    : [...CANONICAL_CATEGORIES];

  const keywordTerms: string[] = [];
  for (const cat of categories) {
    const list = CATEGORY_KEYWORDS[cat as CanonicalCategory];
    if (list && list.length > 0) {
      keywordTerms.push(...list);
    } else {
      keywordTerms.push(`"${cat}"`);
    }
  }

  const keywordsGroup = keywordTerms.join(' OR ');
  return `(${keywordsGroup}) (breakthrough OR discovery OR research OR innovation OR deployment) 2026 -newsletter -roundup`;
}

export function matchCanonicalCategory(categoryName: string | null | undefined): CanonicalCategory | null {
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

export interface TrackerRow {
  id?: string;
  user_id: string;
  category: string;
  fetch_count: number;
  window_start_date: string;
  last_fetched_at?: string | null;
}

/**
 * Loads, normalizes, and rolls the 3-day window for a user in scout_category_tracker.
 * Gracefully falls back to in-memory state if the table does not exist or query fails.
 */
export async function syncAndRotateWindow(
  supabaseAdmin: any,
  userId: string,
  today: string
): Promise<{ trackerRows: TrackerRow[]; lowestCountCategories: string[] }> {
  const defaultRows: TrackerRow[] = CANONICAL_CATEGORIES.map(cat => ({
    user_id: userId,
    category: cat,
    fetch_count: 0,
    window_start_date: today,
    last_fetched_at: null
  }));

  try {
    const { data, error } = await supabaseAdmin
      .from('scout_category_tracker')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('scout_category_tracker query notice:', error.message);
      return {
        trackerRows: defaultRows,
        lowestCountCategories: [...CANONICAL_CATEGORIES]
      };
    }

    const existingRows: TrackerRow[] = (data || []) as TrackerRow[];
    const rowsMap = new Map<string, TrackerRow>();
    for (const r of existingRows) {
      rowsMap.set(r.category, r);
    }

    const updatedRows: TrackerRow[] = [];
    const rowsToUpsert: any[] = [];

    for (const cat of CANONICAL_CATEGORIES) {
      const existing = rowsMap.get(cat);
      if (!existing) {
        const newRow = {
          user_id: userId,
          category: cat,
          fetch_count: 0,
          window_start_date: today,
          last_fetched_at: null
        };
        rowsToUpsert.push(newRow);
        updatedRows.push(newRow);
      } else {
        const windowStatus = getRollingWindowStatus(existing.window_start_date, today);
        if (windowStatus.isExpired) {
          const resetRow = {
            ...existing,
            fetch_count: 0,
            window_start_date: today,
            updated_at: new Date().toISOString()
          };
          rowsToUpsert.push({
            id: existing.id,
            user_id: userId,
            category: cat,
            fetch_count: 0,
            window_start_date: today,
            updated_at: new Date().toISOString()
          });
          updatedRows.push(resetRow);
        } else {
          updatedRows.push(existing);
        }
      }
    }

    if (rowsToUpsert.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from('scout_category_tracker')
        .upsert(rowsToUpsert, { onConflict: 'user_id, category' });

      if (upsertErr) {
        console.warn('Failed to upsert scout_category_tracker rows:', upsertErr.message);
      }
    }

    const lowestCountCategories = getLowestCountCategories(updatedRows);
    return {
      trackerRows: updatedRows,
      lowestCountCategories
    };
  } catch (err: any) {
    console.warn('Graceful fallback in syncAndRotateWindow:', err.message || err);
    return {
      trackerRows: defaultRows,
      lowestCountCategories: [...CANONICAL_CATEGORIES]
    };
  }
}

/**
 * Increments fetch_count and updates last_fetched_at for specified categories.
 */
export async function incrementCategoryFetchCounts(
  supabaseAdmin: any,
  userId: string,
  categoriesToIncrement: string[]
): Promise<void> {
  if (!categoriesToIncrement || categoriesToIncrement.length === 0) return;

  const uniqueCategories = Array.from(new Set(categoriesToIncrement.filter(Boolean)));
  const nowIso = new Date().toISOString();

  for (const category of uniqueCategories) {
    try {
      const { data: row } = await supabaseAdmin
        .from('scout_category_tracker')
        .select('id, fetch_count')
        .eq('user_id', userId)
        .eq('category', category)
        .maybeSingle();

      if (row) {
        await supabaseAdmin
          .from('scout_category_tracker')
          .update({
            fetch_count: (row.fetch_count || 0) + 1,
            last_fetched_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', row.id)
          .eq('user_id', userId);
      } else {
        await supabaseAdmin
          .from('scout_category_tracker')
          .insert({
            user_id: userId,
            category,
            fetch_count: 1,
            window_start_date: nowIso.slice(0, 10),
            last_fetched_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso
          });
      }
    } catch (err: any) {
      console.warn(`Could not increment scout count for category ${category}:`, err.message || err);
    }
  }
}
