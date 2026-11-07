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
      title: 'Open-source low-power telemetry logger for microgrids',
      url: 'https://hackaday.com/telemetry-logger',
      source_name: 'Hackaday',
      summary: 'Developers build an open hardware energy monitoring unit using ESP32 and LoRa.',
      pillar: 'Hardware, sensors & human-machine interface',
      category: 'Hardware, sensors & human-machine interface'
    },
    {
      id: 1,
      title: 'Automated solar irrigation sensors deployed across delta farms',
      url: 'https://agfundernews.com/irrigation-sensors',
      source_name: 'AgFunderNews',
      summary: 'Field robotics startup delivers low-power water monitoring for smallholders.',
      pillar: 'Food systems & agritech',
      category: 'Food systems & agritech'
    },
    {
      id: 2,
      title: 'Second agritech article from same outlet',
      url: 'https://agfundernews.com/crop-duplicate',
      source_name: 'AgFunderNews',
      summary: 'Precision drone sensors detect nutrient deficiencies in legume rotations.',
      pillar: 'Food systems & agritech',
      category: 'Food systems & agritech'
    },
    {
      id: 3,
      title: 'Clinical trial shows dietary polyphenol intervention improves metabolic markers',
      url: 'https://theconversation.com/polyphenol-nutrition',
      source_name: 'The Conversation Health & Wellbeing',
      summary: 'Nutritional biochemistry research reveals marked cellular protection from berry extracts.',
      pillar: 'Nutrition science & wellbeing',
      category: 'Nutrition science & wellbeing'
    },
    {
      id: 4,
      title: 'Micro-hydro turbine controller tested in rural alpine communities',
      url: 'https://phys.org/engineering-microhydro',
      source_name: 'Phys.org Engineering',
      summary: 'Field engineering trials validate low-head electricity generators for remote valleys.',
      pillar: 'Tech & field implementation',
      category: 'Tech & field implementation'
    },
    {
      id: 5,
      title: 'Deep sea oceanography mapping reveals submarine volcanic vents',
      url: 'https://phys.org/ocean-mapping',
      source_name: 'Phys.org Oceanography',
      summary: 'Autonomous submersibles map thermal dynamics in western Pacific abyssal zones.',
      pillar: 'Marine & ocean conservation',
      category: 'Marine & ocean conservation'
    },
    {
      id: 6,
      title: 'Indigenous community restores dryland forest basin',
      url: 'https://india.mongabay.com/dryland-forest',
      source_name: 'Mongabay India',
      summary: 'Villagers establish community seed banks and hydrological regeneration barriers.',
      pillar: 'Community & grassroots ecology',
      category: 'Community & grassroots ecology'
    },
    {
      id: 7,
      title: 'Two new-to-science subterranean fishes reveal a hidden world underneath',
      url: 'https://india.mongabay.com/subterranean-fishes',
      source_name: 'Mongabay India',
      summary: 'Discovery of cave-dwelling fish fauna in Assam subterranean aquifers.',
      pillar: 'Community & grassroots ecology',
      category: 'Community & grassroots ecology'
    },
    {
      id: 8,
      title: 'Small-scale fisheries a big threat to rays in coastal waters',
      url: 'https://oceanconservancy.org/rays-fisheries',
      source_name: 'Ocean Conservancy',
      summary: 'Analysis tracks bycatch mortality of manta and devil rays in artisanal gillnets.',
      pillar: 'Marine & ocean conservation',
      category: 'Marine & ocean conservation'
    }
  ];

  it('correctly maps known sources and aliases to canonical pillars', () => {
    expect(normalizeToPillar('Hackaday')).toBe('Hardware, sensors & human-machine interface');
    expect(normalizeToPillar('TechXplore Robotics')).toBe('Hardware, sensors & human-machine interface');
    expect(normalizeToPillar('AgFunderNews')).toBe('Food systems & agritech');
    expect(normalizeToPillar('Phys.org Agriculture & Plants')).toBe('Food systems & agritech');
    expect(normalizeToPillar('The Conversation Health & Wellbeing')).toBe('Nutrition science & wellbeing');
    expect(normalizeToPillar('The Conversation Health')).toBe('Nutrition science & wellbeing');
    expect(normalizeToPillar('ScienceDaily Nutrition')).toBe('Nutrition science & wellbeing');
    expect(normalizeToPillar('Ocean Conservancy')).toBe('Marine & ocean conservation');
    expect(normalizeToPillar('Phys.org Oceanography')).toBe('Marine & ocean conservation');
    expect(normalizeToPillar('Mongabay India')).toBe('Community & grassroots ecology');
    expect(normalizeToPillar('Phys.org Environment')).toBe('Community & grassroots ecology');
    expect(normalizeToPillar('Phys.org Engineering')).toBe('Tech & field implementation');
    expect(normalizeToPillar('TechXplore Tech News')).toBe('Tech & field implementation');
    expect(normalizeToPillar('Phys.org Biotechnology')).toBe('Food systems & agritech');
  });

  it('accurately identifies animal/wildlife articles vs human health, food systems, and field tech', () => {
    expect(isAnimalOrWildlifeStory(samplePool[7])).toBe(true); // subterranean fishes
    expect(isAnimalOrWildlifeStory(samplePool[8])).toBe(true); // rays in fisheries
    expect(isAnimalOrWildlifeStory(samplePool[0])).toBe(false); // telemetry logger
    expect(isAnimalOrWildlifeStory(samplePool[1])).toBe(false); // solar irrigation sensors
    expect(isAnimalOrWildlifeStory(samplePool[3])).toBe(false); // nutrition clinical trial
    expect(isAnimalOrWildlifeStory(samplePool[4])).toBe(false); // micro-hydro turbine controller
    expect(isAnimalOrWildlifeStory(samplePool[5])).toBe(false); // oceanography mapping
  });

  it('cleans truncated summaries ending in ellipses', () => {
    const raw = 'Breakthrough hardware sensor creates new tactile feedback for prosthetic control. Innovations are expected to accelerate restoration...';
    const cleaned = cleanSummary(raw);
    expect(cleaned.endsWith('...')).toBe(false);
    expect(cleaned).toContain('Breakthrough hardware');
  });

  it('drops duplicate pillars and sources when LLM selects multiple items from the same domain', () => {
    const parsedItems = [
      { id: 1, title: samplePool[1].title, summary: 'Custom LLM summary 1', pillar: 'Food systems & agritech' },
      { id: 2, title: samplePool[2].title, summary: 'Custom LLM summary 2', pillar: 'Food systems & agritech' },
      { id: 6, title: samplePool[6].title, summary: 'Custom LLM summary 3', pillar: 'Community & grassroots ecology' }
    ];

    const yesterdayPillars = new Set(['Hardware, sensors & human-machine interface']);
    const freshPillars = [
      'Food systems & agritech',
      'Nutrition science & wellbeing',
      'Tech & field implementation',
      'Marine & ocean conservation',
      'Community & grassroots ecology'
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    const resultSources = result.map(r => r.source_name);

    expect(new Set(resultPillars).size).toBe(3);
    expect(new Set(resultSources).size).toBe(3);

    const foodCount = result.filter(r => r.pillar === 'Food systems & agritech').length;
    expect(foodCount).toBe(1);
  });

  it('strictly limits yesterday repeats and prioritizes fresh pillars even if LLM picks yesterday pillars', () => {
    // Yesterday covered: Hardware, Food systems, Nutrition
    // Fresh pillars today: Tech & field implementation, Marine & ocean conservation, Community & grassroots ecology
    const yesterdayPillars = new Set([
      'Hardware, sensors & human-machine interface',
      'Food systems & agritech',
      'Nutrition science & wellbeing'
    ]);
    const freshPillars = [
      'Tech & field implementation',
      'Marine & ocean conservation',
      'Community & grassroots ecology'
    ];

    // LLM attempts to pick all 3 items from yesterday's covered pillars
    const parsedItems = [
      { id: 0, title: samplePool[0].title, summary: 'LLM hardware summary' },
      { id: 1, title: samplePool[1].title, summary: 'LLM food summary' },
      { id: 3, title: samplePool[3].title, summary: 'LLM nutrition summary' }
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    expect(new Set(resultPillars).size).toBe(3);

    // Must prioritize the 3 fresh pillars with zero yesterday repeats
    expect(resultPillars).toContain('Tech & field implementation');
    expect(resultPillars).toContain('Marine & ocean conservation');
    expect(resultPillars).toContain('Community & grassroots ecology');

    // 0 items from yesterday permitted when all 3 fresh pillars have candidates
    const yesterdayRepeats = resultPillars.filter(p => yesterdayPillars.has(p));
    expect(yesterdayRepeats.length).toBe(0);
  });

  it('prevents animal/wildlife clustering even across different pillars', () => {
    // Item 7 is fish fauna (Community), Item 8 is rays (Marine)
    const parsedItems = [
      { id: 7, title: samplePool[7].title, summary: 'Subterranean fish discovery' },
      { id: 8, title: samplePool[8].title, summary: 'Ray bycatch in fisheries' }
    ];

    const yesterdayPillars = new Set(['Hardware, sensors & human-machine interface']);
    const freshPillars = [
      'Food systems & agritech',
      'Nutrition science & wellbeing',
      'Tech & field implementation',
      'Marine & ocean conservation',
      'Community & grassroots ecology'
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
        id: '1', // string ID
        title: 'Automated Solar Irrigation Sensors Deployed Across Delta Farms', // slightly different casing
        summary: 'Startup deploys intelligent low-power field sensors for smallholder irrigation monitoring.'
      }
    ];

    const result = selectDiverseNewsItems(parsedItems, samplePool, new Set(), CANONICAL_PILLARS);

    expect(result).toHaveLength(3);
    const foodItem = result.find(r => r.pillar === 'Food systems & agritech');
    expect(foodItem).toBeDefined();
    expect(foodItem.summary).toBe('Startup deploys intelligent low-power field sensors for smallholder irrigation monitoring.');
  });

  it('executes Tier 3 fallback with fresh pillar priority when LLM generation fails', () => {
    const yesterdayPillars = new Set([
      'Hardware, sensors & human-machine interface',
      'Food systems & agritech',
      'Nutrition science & wellbeing'
    ]);
    const freshPillars = [
      'Tech & field implementation',
      'Marine & ocean conservation',
      'Community & grassroots ecology'
    ];

    // LLM returned 0 items
    const result = selectDiverseNewsItems([], samplePool, yesterdayPillars, freshPillars);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    expect(new Set(resultPillars).size).toBe(3);
    expect(resultPillars).toContain('Tech & field implementation');
    expect(resultPillars).toContain('Marine & ocean conservation');
    expect(resultPillars).toContain('Community & grassroots ecology');
  });

  it('sorts unrepresented pillars by frequency count to favor least-used pillars', () => {
    const yesterdayPillars = new Set([
      'Hardware, sensors & human-machine interface',
      'Food systems & agritech',
      'Nutrition science & wellbeing'
    ]);
    const freshPillars = [
      'Tech & field implementation',
      'Marine & ocean conservation'
    ];
    const recentPillarCounts = {
      'Tech & field implementation': 4,
      'Marine & ocean conservation': 0,
      'Community & grassroots ecology': 1
    };

    const subsetPool = [samplePool[5], samplePool[6], samplePool[0]];
    const result = selectDiverseNewsItems([], subsetPool, yesterdayPillars, freshPillars, recentPillarCounts);

    expect(result).toHaveLength(3);
    const resultPillars = result.map(r => r.pillar);
    expect(resultPillars[0]).toBe('Marine & ocean conservation');
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
