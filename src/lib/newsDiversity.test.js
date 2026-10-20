import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PILLARS,
  SOURCE_TO_PILLAR,
  normalizeToPillar,
  isAnimalOrWildlifeStory,
  cleanSummary,
  selectDiverseNewsItems
} from './newsDiversity';

describe('newsDiversity module', () => {
  const samplePool = [
    {
      id: 0,
      title: 'CRISPR base editing breakthrough in crop genetics',
      url: 'https://phys.org/crispr-1',
      source_name: 'Phys.org Biotechnology',
      summary: 'Researchers demonstrate new high-yield genetic editing in drought-resistant grains.',
      pillar: 'Biotechnology & genetic engineering',
      category: 'Biotechnology & genetic engineering'
    },
    {
      id: 1,
      title: 'New malaria vaccine trials show 80 percent efficacy',
      url: 'https://theconversation.com/malaria-vaccine',
      source_name: 'The Conversation Health',
      summary: 'Public health field trials confirm high protection rate in rural clinics.',
      pillar: 'Health & medicine',
      category: 'Health & medicine'
    },
    {
      id: 2,
      title: 'Second health article from same outlet',
      url: 'https://theconversation.com/health-duplicate',
      source_name: 'The Conversation Health',
      summary: 'Study tracks primary care access across decentralised networks.',
      pillar: 'Health & medicine',
      category: 'Health & medicine'
    },
    {
      id: 3,
      title: 'Deep sea oceanography mapping reveals submarine volcanic vents',
      url: 'https://phys.org/ocean-mapping',
      source_name: 'Phys.org Oceanography',
      summary: 'Autonomous submersibles map thermal dynamics in western Pacific abyssal zones.',
      pillar: 'Marine & ocean conservation',
      category: 'Marine & ocean conservation'
    },
    {
      id: 4,
      title: 'Indigenous community restores dryland forest basin',
      url: 'https://india.mongabay.com/dryland-forest',
      source_name: 'Mongabay India',
      summary: 'Villagers establish community seed banks and hydrological regeneration barriers.',
      pillar: 'Community & grassroots ecology',
      category: 'Community & grassroots ecology'
    },
    {
      id: 5,
      title: 'Two new-to-science subterranean fishes reveal a hidden world underneath',
      url: 'https://india.mongabay.com/subterranean-fishes',
      source_name: 'Mongabay India',
      summary: 'Discovery of cave-dwelling fish fauna in Assam subterranean aquifers.',
      pillar: 'Community & grassroots ecology',
      category: 'Community & grassroots ecology'
    },
    {
      id: 6,
      title: 'Automated solar irrigation sensors deployed across delta farms',
      url: 'https://agfundernews.com/irrigation-sensors',
      source_name: 'AgFunderNews',
      summary: 'Field robotics startup delivers low-power water monitoring for smallholders.',
      pillar: 'Tech & field implementation',
      category: 'Tech & field implementation'
    },
    {
      id: 7,
      title: 'Small-scale fisheries a big threat to rays in coastal waters',
      url: 'https://oceanconservancy.org/rays-fisheries',
      source_name: 'Ocean Conservancy',
      summary: 'Analysis tracks bycatch mortality of manta and devil rays in artisanal gillnets.',
      pillar: 'Marine & ocean conservation',
      category: 'Marine & ocean conservation'
    }
  ];

  it('correctly maps known sources and aliases to canonical pillars', () => {
    expect(normalizeToPillar('Phys.org Biotechnology')).toBe('Biotechnology & genetic engineering');
    expect(normalizeToPillar('The Conversation Health')).toBe('Health & medicine');
    expect(normalizeToPillar('Ocean Conservancy')).toBe('Marine & ocean conservation');
    expect(normalizeToPillar('Mongabay India')).toBe('Community & grassroots ecology');
    expect(normalizeToPillar('AgFunderNews')).toBe('Tech & field implementation');
    expect(normalizeToPillar('Phys.org Engineering')).toBe('Tech & field implementation');
  });

  it('accurately identifies animal/wildlife articles vs human health and field tech', () => {
    expect(isAnimalOrWildlifeStory(samplePool[5])).toBe(true); // subterranean fishes
    expect(isAnimalOrWildlifeStory(samplePool[7])).toBe(true); // rays in fisheries
    expect(isAnimalOrWildlifeStory(samplePool[0])).toBe(false); // crop genetics
    expect(isAnimalOrWildlifeStory(samplePool[1])).toBe(false); // malaria vaccine
    expect(isAnimalOrWildlifeStory(samplePool[3])).toBe(false); // oceanography mapping
    expect(isAnimalOrWildlifeStory(samplePool[6])).toBe(false); // solar irrigation sensors
  });

  it('cleans truncated summaries ending in ellipses', () => {
    const raw = 'BreakthroughKirigami technology creates new scaffold structures for tissue engineering. Innovations are expected to accelerate wound repair...';
    const cleaned = cleanSummary(raw);
    expect(cleaned.endsWith('...')).toBe(false);
    expect(cleaned).toContain('BreakthroughKirigami');
  });

  it('drops duplicate pillars and sources when LLM selects multiple items from the same domain', () => {
    const parsedItems = [
      { id: 1, title: samplePool[1].title, summary: 'Custom LLM summary 1', pillar: 'Health & medicine' },
      { id: 2, title: samplePool[2].title, summary: 'Custom LLM summary 2', pillar: 'Health & medicine' },
      { id: 4, title: samplePool[4].title, summary: 'Custom LLM summary 3', pillar: 'Community & grassroots ecology' }
    ];

    const yesterdayPillars = new Set(['Biotechnology & genetic engineering']);
    const freshPillars = [
      'Health & medicine',
      'Marine & ocean conservation',
      'Community & grassroots ecology',
      'Tech & field implementation'
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    const resultSources = result.map(r => r.source_name);

    expect(new Set(resultPillars).size).toBe(3);
    expect(new Set(resultSources).size).toBe(3);

    const healthCount = result.filter(r => r.pillar === 'Health & medicine').length;
    expect(healthCount).toBe(1);
  });

  it('strictly limits yesterday repeats and prioritizes fresh pillars even if LLM picks yesterday pillars', () => {
    // Yesterday covered: Biotechnology, Health, Marine
    // Fresh pillars today: Community & grassroots ecology, Tech & field implementation
    const yesterdayPillars = new Set([
      'Biotechnology & genetic engineering',
      'Health & medicine',
      'Marine & ocean conservation'
    ]);
    const freshPillars = [
      'Community & grassroots ecology',
      'Tech & field implementation'
    ];

    // LLM attempts to pick all 3 items from yesterday's covered pillars
    const parsedItems = [
      { id: 0, title: samplePool[0].title, summary: 'LLM biotech summary' },
      { id: 1, title: samplePool[1].title, summary: 'LLM health summary' },
      { id: 3, title: samplePool[3].title, summary: 'LLM marine summary' }
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    expect(new Set(resultPillars).size).toBe(3);

    // Must prioritize the 2 fresh pillars
    expect(resultPillars).toContain('Community & grassroots ecology');
    expect(resultPillars).toContain('Tech & field implementation');

    // At most 1 pillar from yesterday may be retained as rotating item
    const yesterdayRepeats = resultPillars.filter(p => yesterdayPillars.has(p));
    expect(yesterdayRepeats.length).toBeLessThanOrEqual(1);
  });

  it('prevents animal/wildlife clustering even across different pillars', () => {
    // Item 5 is fish fauna (Community), Item 7 is rays (Marine)
    const parsedItems = [
      { id: 5, title: samplePool[5].title, summary: 'Subterranean fish discovery' },
      { id: 7, title: samplePool[7].title, summary: 'Ray bycatch in fisheries' }
    ];

    const yesterdayPillars = new Set(['Biotechnology & genetic engineering']);
    const freshPillars = [
      'Health & medicine',
      'Marine & ocean conservation',
      'Community & grassroots ecology',
      'Tech & field implementation'
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    expect(new Set(resultPillars).size).toBe(3);

    // At most 1 animal story permitted across the entire selection
    const animalCount = result.filter(r => isAnimalOrWildlifeStory(r)).length;
    expect(animalCount).toBeLessThanOrEqual(1);
  });

  it('handles string IDs and fuzzy title matching from LLMs without losing summaries', () => {
    const parsedItems = [
      {
        id: '6', // string ID
        title: 'Automated Solar Irrigation Sensors Deployed Across Delta Farms', // slightly different casing
        summary: 'Startup deploys intelligent low-power field sensors for smallholder irrigation monitoring.'
      }
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, new Set(), CANONICAL_PILLARS);

    expect(result).toHaveLength(3);
    const techItem = result.find(r => r.pillar === 'Tech & field implementation');
    expect(techItem).toBeDefined();
    expect(techItem.summary).toBe('Startup deploys intelligent low-power field sensors for smallholder irrigation monitoring.');
  });

  it('executes Tier 3 fallback with fresh pillar priority when LLM generation fails', () => {
    const yesterdayPillars = new Set([
      'Biotechnology & genetic engineering',
      'Health & medicine',
      'Marine & ocean conservation'
    ]);
    const freshPillars = [
      'Community & grassroots ecology',
      'Tech & field implementation'
    ];

    // LLM returned 0 items
    const result = selectDiverseNewsItems([], samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    expect(new Set(resultPillars).size).toBe(3);
    expect(resultPillars).toContain('Community & grassroots ecology');
    expect(resultPillars).toContain('Tech & field implementation');
  });

  it('handles edge case when pool has fewer than 3 items safely', () => {
    const tinyPool = [samplePool[0], samplePool[1]];
    const result = selectDiverseNewsItems([], tinyPool, new Set(), CANONICAL_PILLARS);
    expect(result).toHaveLength(2);
  });

  it('handles edge case when pool is empty safely', () => {
    const result = selectDiverseNewsItems([], [], new Set(), CANONICAL_PILLARS);
    expect(result).toEqual([]);
  });
});
