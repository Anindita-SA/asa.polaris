export const CANONICAL_PILLARS = [
  'Biotechnology & genetic engineering',
  'Health & medicine',
  'Marine & ocean conservation',
  'Community & grassroots ecology',
  'Tech & field implementation'
];

export const SOURCE_TO_PILLAR = {
  'Phys.org Biotechnology': 'Biotechnology & genetic engineering',
  'The Conversation Health': 'Health & medicine',
  'Ocean Conservancy': 'Marine & ocean conservation',
  'Phys.org Oceanography': 'Marine & ocean conservation',
  'Hakai Magazine': 'Marine & ocean conservation',
  'Mongabay India': 'Community & grassroots ecology',
  'Mongabay Global': 'Community & grassroots ecology',
  'AgFunderNews': 'Tech & field implementation',
  'Phys.org Engineering': 'Tech & field implementation',
  'Wildlabs': 'Tech & field implementation',
  'Innovation Origins': 'Tech & field implementation'
};

export const DEFAULT_FEEDS_BY_PILLAR = {
  'Biotechnology & genetic engineering': [
    { name: 'Phys.org Biotechnology', url: 'https://phys.org/rss-feed/biology-news/biotechnology/' }
  ],
  'Health & medicine': [
    { name: 'The Conversation Health', url: 'https://theconversation.com/global/health/articles.atom' }
  ],
  'Marine & ocean conservation': [
    { name: 'Ocean Conservancy', url: 'https://oceanconservancy.org/feed/' },
    { name: 'Phys.org Oceanography', url: 'https://phys.org/rss-feed/earth-news/oceanography/' }
  ],
  'Community & grassroots ecology': [
    { name: 'Mongabay India', url: 'https://india.mongabay.com/feed/' },
    { name: 'Mongabay Global', url: 'https://news.mongabay.com/feed/' }
  ],
  'Tech & field implementation': [
    { name: 'AgFunderNews', url: 'https://agfundernews.com/feed' },
    { name: 'Phys.org Engineering', url: 'https://phys.org/rss-feed/technology-news/engineering/' }
  ]
};

export function normalizeToPillar(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  if (
    s.includes('biotech') ||
    s.includes('genetic') ||
    s.includes('cellular') ||
    s.includes('phys.org biology') ||
    s.includes('tissue engineering')
  ) {
    return 'Biotechnology & genetic engineering';
  }
  if (
    s.includes('health') ||
    s.includes('medicine') ||
    s.includes('medical') ||
    s.includes('vaccine') ||
    s.includes('disease') ||
    s.includes('conversation health')
  ) {
    return 'Health & medicine';
  }
  if (
    s.includes('marine') ||
    s.includes('ocean') ||
    s.includes('hakai') ||
    s.includes('oceanography') ||
    s.includes('coastal') ||
    s.includes('coral') ||
    s.includes('fisheries') ||
    s.includes('ocean conservancy')
  ) {
    return 'Marine & ocean conservation';
  }
  if (
    s.includes('community') ||
    s.includes('grassroots') ||
    s.includes('mongabay') ||
    s.includes('indigenous') ||
    s.includes('forest') ||
    s.includes('biodiversity') ||
    s.includes('wildlife')
  ) {
    return 'Community & grassroots ecology';
  }
  if (
    s.includes('tech') ||
    s.includes('wildlabs') ||
    s.includes('innovation') ||
    s.includes('agfunder') ||
    s.includes('agriculture') ||
    s.includes('hardware') ||
    s.includes('sensor') ||
    s.includes('telemetry') ||
    s.includes('engineering')
  ) {
    return 'Tech & field implementation';
  }
  return null;
}

export function isAnimalOrWildlifeStory(item) {
  if (!item) return false;
  const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase();
  
  const animalPattern = /\b(animal|animals|wildlife|fauna|fish|fishes|mammal|mammals|bird|birds|reptile|reptiles|amphibian|amphibians|primate|primates|shark|sharks|whale|whales|ray|rays|tiger|tigers|elephant|elephants|insect|insects|bear|bears|wolf|wolves|frog|frogs|turtle|turtles|coral|corals|zooplankton|crustacean|crustaceans|subterranean fishes)\b/i;
  
  const nonAnimalContext = /\b(patient|patients|clinical trial|human health|hospital|cancer|vaccine|blood|diagnostic|wearable|sensor|sensors|crop|crops|grain|wheat|rice|forestry|satellite|irrigation)\b/i;
  
  if (animalPattern.test(text) && !nonAnimalContext.test(text)) {
    return true;
  }
  return false;
}

export function cleanSummary(text) {
  let s = (text || '').replace(/\s+/g, ' ').trim();
  if (s.endsWith('...')) {
    s = s.slice(0, -3).trim();
    const lastPeriod = s.lastIndexOf('.');
    if (lastPeriod > 40) {
      s = s.slice(0, lastPeriod + 1);
    }
  }
  return s;
}

export function selectDiverseNewsItems(
  parsedItems = [],
  pool = [],
  yesterdayPillars = new Set(),
  freshPillars = []
) {
  const selected = [];
  const selectedPillars = new Set();
  const selectedSources = new Set();
  const selectedUrls = new Set();
  let selectedAnimalCount = 0;
  let selectedYesterdayCount = 0;

  const yesterdaySet = yesterdayPillars instanceof Set
    ? yesterdayPillars
    : new Set(yesterdayPillars || []);

  const availableFreshPillars = (freshPillars || []).filter(fresh =>
    pool.some(candidate => candidate.pillar === fresh)
  );

  const maxYesterdayAllowed = Math.max(1, 3 - availableFreshPillars.length);

  const parseId = (id) => {
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && /^\d+$/.test(id.trim())) return parseInt(id.trim(), 10);
    return null;
  };

  const normalizeTitle = (title) =>
    (title || '').toLowerCase().replace(/['"‘’“”]/g, '').replace(/\s+/g, ' ').trim();

  // 1. Process and validate LLM candidate picks
  for (const item of parsedItems) {
    if (selected.length >= 3) break;

    let matched = null;
    const parsedId = parseId(item.id);
    if (parsedId !== null && pool[parsedId]) {
      matched = pool[parsedId];
    } else if (item.url) {
      matched = pool.find(p => p.url === item.url);
    } else if (item.title) {
      const cleanTarget = normalizeTitle(item.title);
      matched = pool.find(p => {
        const cleanP = normalizeTitle(p.title);
        return cleanP === cleanTarget || cleanP.includes(cleanTarget) || cleanTarget.includes(cleanP);
      });
    }

    if (!matched) continue;

    // Reject duplicate pillar, duplicate source, or duplicate URL
    if (
      selectedPillars.has(matched.pillar) ||
      selectedSources.has(matched.source_name) ||
      selectedUrls.has(matched.url)
    ) {
      continue;
    }

    // Anti-repeat constraint: Don't repeat yesterday's pillars if fresh pillars are available
    const isFromYesterday = yesterdaySet.has(matched.pillar);
    if (isFromYesterday && selectedYesterdayCount >= maxYesterdayAllowed) {
      continue;
    }

    // Animal anti-clustering constraint: Max 1 animal/wildlife story across brief
    const isAnimal = isAnimalOrWildlifeStory(matched);
    if (isAnimal && selectedAnimalCount >= 1) {
      continue;
    }

    const rawSummary = (item.summary && item.summary.trim().length > 20)
      ? item.summary.trim()
      : matched.summary;

    selected.push({
      ...matched,
      summary: cleanSummary(rawSummary)
    });
    selectedPillars.add(matched.pillar);
    selectedSources.add(matched.source_name);
    selectedUrls.add(matched.url);
    if (isAnimal) selectedAnimalCount++;
    if (isFromYesterday) selectedYesterdayCount++;
  }

  // 2. Programmatic Backfill
  // Pass A: Unrepresented fresh pillars from yesterday (anti-repeat rotation)
  for (const freshPillar of (freshPillars || [])) {
    if (selected.length >= 3) break;
    if (selectedPillars.has(freshPillar)) continue;

    const candidate = pool.find(p =>
      p.pillar === freshPillar &&
      !selectedSources.has(p.source_name) &&
      !selectedUrls.has(p.url) &&
      (!isAnimalOrWildlifeStory(p) || selectedAnimalCount < 1)
    );
    if (candidate) {
      selected.push({
        ...candidate,
        summary: cleanSummary(candidate.summary)
      });
      selectedPillars.add(candidate.pillar);
      selectedSources.add(candidate.source_name);
      selectedUrls.add(candidate.url);
      if (isAnimalOrWildlifeStory(candidate)) selectedAnimalCount++;
    }
  }

  // Pass B: Any other unrepresented canonical pillar not yet selected today
  for (const pillar of CANONICAL_PILLARS) {
    if (selected.length >= 3) break;
    if (selectedPillars.has(pillar)) continue;

    const candidate = pool.find(p =>
      p.pillar === pillar &&
      !selectedSources.has(p.source_name) &&
      !selectedUrls.has(p.url) &&
      (!isAnimalOrWildlifeStory(p) || selectedAnimalCount < 1)
    );
    if (candidate) {
      selected.push({
        ...candidate,
        summary: cleanSummary(candidate.summary)
      });
      selectedPillars.add(candidate.pillar);
      selectedSources.add(candidate.source_name);
      selectedUrls.add(candidate.url);
      if (isAnimalOrWildlifeStory(candidate)) selectedAnimalCount++;
    }
  }

  // Pass C: Relax animal constraint if no non-animal candidate is available for unrepresented pillars
  for (const pillar of CANONICAL_PILLARS) {
    if (selected.length >= 3) break;
    if (selectedPillars.has(pillar)) continue;

    const candidate = pool.find(p =>
      p.pillar === pillar &&
      !selectedSources.has(p.source_name) &&
      !selectedUrls.has(p.url)
    );
    if (candidate) {
      selected.push({
        ...candidate,
        summary: cleanSummary(candidate.summary)
      });
      selectedPillars.add(candidate.pillar);
      selectedSources.add(candidate.source_name);
      selectedUrls.add(candidate.url);
    }
  }

  // Pass D: Relax source constraint if pool has fewer than 3 sources
  for (const item of pool) {
    if (selected.length >= 3) break;
    if (!selectedPillars.has(item.pillar) && !selectedUrls.has(item.url)) {
      selected.push({
        ...item,
        summary: cleanSummary(item.summary)
      });
      selectedPillars.add(item.pillar);
      selectedSources.add(item.source_name);
      selectedUrls.add(item.url);
    }
  }

  // Pass E: Emergency fallback if pool has fewer than 3 pillars total
  for (const item of pool) {
    if (selected.length >= 3) break;
    if (!selectedUrls.has(item.url)) {
      selected.push({
        ...item,
        summary: cleanSummary(item.summary)
      });
      selectedUrls.add(item.url);
    }
  }

  return selected;
}
