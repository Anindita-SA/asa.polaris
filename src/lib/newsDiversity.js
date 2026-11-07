export const CANONICAL_PILLARS = [
  'Hardware, sensors & human-machine interface',
  'Food systems & agritech',
  'Nutrition science & wellbeing',
  'Tech & field implementation',
  'Marine & ocean conservation',
  'Community & grassroots ecology'
];

export const SOURCE_TO_PILLAR = {
  'Hackaday': 'Hardware, sensors & human-machine interface',
  'TechXplore Robotics': 'Hardware, sensors & human-machine interface',
  'TechXplore Hardware': 'Hardware, sensors & human-machine interface',
  'AgFunderNews': 'Food systems & agritech',
  'Phys.org Agriculture & Plants': 'Food systems & agritech',
  'The Conversation Health & Wellbeing': 'Nutrition science & wellbeing',
  'The Conversation Health': 'Nutrition science & wellbeing',
  'ScienceDaily Nutrition': 'Nutrition science & wellbeing',
  'ScienceDaily Fitness & Wellbeing': 'Nutrition science & wellbeing',
  'ScienceDaily Fitness': 'Nutrition science & wellbeing',
  'Phys.org Engineering': 'Tech & field implementation',
  'TechXplore Tech News': 'Tech & field implementation',
  'Wildlabs': 'Tech & field implementation',
  'Innovation Origins': 'Tech & field implementation',
  'Ocean Conservancy': 'Marine & ocean conservation',
  'Phys.org Oceanography': 'Marine & ocean conservation',
  'Hakai Magazine': 'Marine & ocean conservation',
  'Phys.org Environment': 'Community & grassroots ecology',
  'Phys.org Ecology': 'Community & grassroots ecology',
  'Mongabay India': 'Community & grassroots ecology',
  'Mongabay Global': 'Community & grassroots ecology',
  'Phys.org Biotechnology': 'Food systems & agritech'
};

export const DEFAULT_FEEDS_BY_PILLAR = {
  'Hardware, sensors & human-machine interface': [
    { name: 'Hackaday', url: 'https://hackaday.com/feed/' },
    { name: 'TechXplore Robotics', url: 'https://techxplore.com/rss-feed/robotics-news/' },
    { name: 'TechXplore Hardware', url: 'https://techxplore.com/rss-feed/hardware-news/' }
  ],
  'Food systems & agritech': [
    { name: 'AgFunderNews', url: 'https://agfundernews.com/feed' },
    { name: 'Phys.org Agriculture & Plants', url: 'https://phys.org/rss-feed/biology-news/plants-animals/' }
  ],
  'Nutrition science & wellbeing': [
    { name: 'The Conversation Health & Wellbeing', url: 'https://theconversation.com/global/health/articles.atom' },
    { name: 'ScienceDaily Nutrition', url: 'https://www.sciencedaily.com/rss/health_medicine/nutrition.xml' },
    { name: 'ScienceDaily Fitness & Wellbeing', url: 'https://www.sciencedaily.com/rss/health_medicine/fitness.xml' }
  ],
  'Tech & field implementation': [
    { name: 'Phys.org Engineering', url: 'https://phys.org/rss-feed/technology-news/engineering/' },
    { name: 'TechXplore Tech News', url: 'https://techxplore.com/rss-feed/' }
  ],
  'Marine & ocean conservation': [
    { name: 'Ocean Conservancy', url: 'https://oceanconservancy.org/feed/' },
    { name: 'Phys.org Oceanography', url: 'https://phys.org/rss-feed/earth-news/oceanography/' }
  ],
  'Community & grassroots ecology': [
    { name: 'Phys.org Environment', url: 'https://phys.org/rss-feed/earth-news/environment/' },
    { name: 'Phys.org Ecology', url: 'https://phys.org/rss-feed/biology-news/ecology/' }
  ]
};

export function normalizeToPillar(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();

  // 1. Hardware, sensors & human-machine interface
  if (
    s.includes('hardware') ||
    s.includes('sensor') ||
    s.includes('hmi') ||
    s.includes('human-machine') ||
    s.includes('interface') ||
    s.includes('robotics') ||
    s.includes('robot') ||
    s.includes('hackaday') ||
    s.includes('techxplore hardware') ||
    s.includes('techxplore robotics') ||
    s.includes('embedded')
  ) {
    return 'Hardware, sensors & human-machine interface';
  }

  // 2. Food systems & agritech
  if (
    s.includes('food') ||
    s.includes('agritech') ||
    s.includes('agfunder') ||
    s.includes('agriculture') ||
    s.includes('farming') ||
    s.includes('hydroponic') ||
    s.includes('vertical farm') ||
    s.includes('crop') ||
    s.includes('plants-animals')
  ) {
    return 'Food systems & agritech';
  }

  // 3. Nutrition science & wellbeing (also maps legacy Health & medicine)
  if (
    s.includes('nutrition') ||
    s.includes('wellbeing') ||
    s.includes('diet') ||
    s.includes('fitness') ||
    s.includes('health') ||
    s.includes('medicine') ||
    s.includes('medical') ||
    s.includes('metabolic') ||
    s.includes('sciencedaily nutrition') ||
    s.includes('sciencedaily fitness') ||
    s.includes('conversation health')
  ) {
    return 'Nutrition science & wellbeing';
  }

  // 4. Marine & ocean conservation
  if (
    s.includes('marine') ||
    s.includes('ocean') ||
    s.includes('oceanography') ||
    s.includes('hakai') ||
    s.includes('coastal') ||
    s.includes('coral') ||
    s.includes('fisheries') ||
    s.includes('ocean conservancy')
  ) {
    return 'Marine & ocean conservation';
  }

  // 5. Community & grassroots ecology
  if (
    s.includes('community') ||
    s.includes('grassroots') ||
    s.includes('ecology') ||
    s.includes('environment') ||
    s.includes('mongabay') ||
    s.includes('indigenous') ||
    s.includes('forest') ||
    s.includes('biodiversity')
  ) {
    return 'Community & grassroots ecology';
  }

  // 6. Legacy fallback: map old Biotechnology & genetic engineering to Food systems & agritech
  if (
    s.includes('biotech') ||
    s.includes('genetic') ||
    s.includes('cellular') ||
    s.includes('phys.org biology') ||
    s.includes('tissue engineering')
  ) {
    return 'Food systems & agritech';
  }

  // 7. Tech & field implementation
  if (
    s.includes('tech') ||
    s.includes('engineering') ||
    s.includes('field implementation') ||
    s.includes('wildlabs') ||
    s.includes('innovation') ||
    s.includes('telemetry')
  ) {
    return 'Tech & field implementation';
  }

  return null;
}

export function isAnimalOrWildlifeStory(item) {
  if (!item) return false;
  const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase();
  
  const animalPattern = /\b(animal|animals|wildlife|fauna|fish|fishes|mammal|mammals|bird|birds|reptile|reptiles|amphibian|amphibians|primate|primates|shark|sharks|whale|whales|ray|rays|tiger|tigers|elephant|elephants|insect|insects|bear|bears|wolf|wolves|frog|frogs|turtle|turtles|coral|corals|zooplankton|crustacean|crustaceans|subterranean fishes)\b/i;
  
  const nonAnimalContext = /\b(patient|patients|clinical trial|human health|hospital|cancer|vaccine|blood|diagnostic|wearable|sensor|sensors|crop|crops|grain|wheat|rice|forestry|satellite|irrigation|nutrition|diet|food|agritech|hardware|robot|interface|wellbeing|mental health|exercise)\b/i;
  
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
  freshPillars = [],
  recentPillarCounts = {}
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

  const maxYesterdayAllowed = Math.max(0, 3 - availableFreshPillars.length);

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
  // Pass A: Unrepresented fresh pillars from yesterday sorted ascending by 5-day frequency count
  const sortedFreshPillars = [...(freshPillars || [])].sort(
    (a, b) => (recentPillarCounts[a] || 0) - (recentPillarCounts[b] || 0)
  );

  for (const freshPillar of sortedFreshPillars) {
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

  // Pass B: Any other unrepresented canonical pillar not yet selected today, sorted ascending by 5-day frequency count
  const remainingPillarsForB = CANONICAL_PILLARS
    .filter(p => !selectedPillars.has(p))
    .sort((a, b) => (recentPillarCounts[a] || 0) - (recentPillarCounts[b] || 0));

  for (const pillar of remainingPillarsForB) {
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
  const remainingPillarsForC = CANONICAL_PILLARS
    .filter(p => !selectedPillars.has(p))
    .sort((a, b) => (recentPillarCounts[a] || 0) - (recentPillarCounts[b] || 0));

  for (const pillar of remainingPillarsForC) {
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
