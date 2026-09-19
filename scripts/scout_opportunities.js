import { createSafeClient } from './lib/safe_supabase.js';
import { generateWithFallbackNode } from './lib/llm_utils.js';
import 'dotenv/config';

export const config = {
  groqApiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || null,
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || null
};

export function validateEnvironment(cfg = config) {
  if (!cfg.groqApiKey && !cfg.geminiApiKey) {
    throw new Error('Missing required environment variable (GROQ_API_KEY or GEMINI_API_KEY).');
  }
}

function parseRssXml(xml, sourceName) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    let title = '';
    let link = '';
    let description = '';

    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i);
    if (titleMatch) title = (titleMatch[1] || titleMatch[2] || '').trim();

    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/i);
    if (linkMatch) link = (linkMatch[1] || linkMatch[2] || '').trim();

    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
    if (descMatch) {
      description = (descMatch[1] || descMatch[2] || '')
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (title && link) {
      items.push({
        title,
        url: link,
        description: description || title,
        source_name: sourceName
      });
    }
  }

  return items;
}

export async function fetchOpportunityFeeds() {
  const feeds = [
    { name: 'Opportunity Desk', url: 'https://opportunitydesk.org/feed/' },
    { name: 'FundsForNGOs', url: 'https://www.fundsforngos.org/feed/' }
  ];

  const pool = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseRssXml(xml, feed.name);
        pool.push(...parsed.slice(0, 5));
      } else {
        console.warn(`Feed ${feed.name} returned status ${res.status}`);
      }
    } catch (err) {
      console.warn(`Error fetching feed ${feed.name}:`, err.message);
    }
  }

  return pool;
}

export const APPLICANT_PROFILE = `Bangladeshi national, Indian student visa (non-resident). Final-year BTech EEE at NIT Trichy (7th sem), power electronics research + fine arts (drawing, painting, writing) and product design background. Parallel tracks: (1) hardware, power electronics, conservation/agri/climate tech (2) industrial/product design, independent art/creative writing grants, and free certified technical/design training. Treat all tracks as equal priority without default bias.`;

export function buildOpportunitiesPrompt(minifiedPool, learnedFeedback = '') {
  return `Opportunity pool:
${JSON.stringify(minifiedPool)}

Applicant: ${APPLICANT_PROFILE}

Pick 2-3 best fits (fewer is fine if others fail constraints, do not pad).

Rank: (1) fully-funded travel/field research/residencies (2) hardware/conservation/agri/climate tech grants, UN programs, product design/art competitions, emerging artist grants, free industry-certified training (equal tier, not hardware-first) (3) research fellowships/grants (4) rest.

NATIONALITY & REGIONAL ELIGIBILITY (STRICT):
- If eligible countries/regions are listed (e.g. Africa, SIDS, Latin America, EU only), Bangladesh MUST be explicitly included.
- If Bangladesh is missing or restricted to other regions/citizenships, reject with profile_match: 0.

Reject if:
- Ineligible for Bangladeshi nationals.
- Aggregators, newsletters, listicles (direct application page required).
- Requires Indian residency/citizenship.
- Requires self-funding, out-of-pocket costs, or paid application fees.
- Deadline passed.
- If unconfirmed, flag in project_fit instead of rejecting outright.
${learnedFeedback ? `\nLEARNED REJECTIONS (DO NOT REPEAT):\n${learnedFeedback}\n` : ''}
effort: application work only (low: form, med: 1-2 essays/portfolio, high: multi-stage/interview).
profile_match (0-100): Alignment with applicant profile across hardware/tech, design/art, or certified training, nationality, and undergrad status.
acceptance_chance (0-100): Realistic selection probability based on competition and profile fit.

JSON only, no preamble/fences:
{"opportunities":[{"title":"","url":"","deadline":"YYYY-MM-DD or null","effort":"low|med|high","profile_match":85,"acceptance_chance":60,"project_fit":"","what_offered":""}]}`;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting Opportunity Scout${isDryRun ? ' [DRY-RUN MODE]' : ''}...`);

  validateEnvironment();
  const safeClient = await createSafeClient('scout_opportunities.js', false, isDryRun);
  const userId = safeClient._uid;

  // 1. Fetch live RSS opportunity feeds
  const pool = await fetchOpportunityFeeds();
  console.log(`Fetched ${pool.length} candidate items from opportunity feeds.`);

  if (pool.length === 0) {
    console.log('No items retrieved from feeds. Exiting.');
    return;
  }

  // 2. Fetch past rejection reasons for learned feedback
  const { data: rejectedFeedback } = await safeClient
    .from('hardware_opportunities')
    .select('title, rejection_reason')
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .not('rejection_reason', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6);

  let learnedFeedback = '';
  if (rejectedFeedback && rejectedFeedback.length > 0) {
    learnedFeedback = rejectedFeedback
      .filter(rf => rf.rejection_reason && rf.rejection_reason.trim())
      .map(rf => `- ${rf.title}: ${rf.rejection_reason.trim()}`)
      .join('\n');
  }

  // 3. Deduplicate against existing opportunities in Supabase
  const candidateUrls = pool.map(p => p.url).filter(Boolean);
  const { data: existingOpps } = await safeClient
    .from('hardware_opportunities')
    .select('url')
    .eq('user_id', userId)
    .in('url', candidateUrls);

  const existingUrls = new Set((existingOpps || []).map(o => o.url));
  const newPool = pool.filter(p => !existingUrls.has(p.url));

  console.log(`Found ${newPool.length} un-scouted candidates after deduplication.`);
  if (newPool.length === 0) {
    console.log('All candidate URLs already exist in the database. Exiting.');
    return;
  }

  // 4. Evaluate candidates via LLM
  const minifiedPool = newPool.slice(0, 6).map(item => ({
    title: item.title,
    url: item.url,
    description: (item.description || item.title).slice(0, 500),
    source: item.source_name
  }));

  const prompt = buildOpportunitiesPrompt(minifiedPool, learnedFeedback);
  let parsedOpps = [];

  try {
    const rawOutput = await generateWithFallbackNode(prompt, config.groqApiKey, config.geminiApiKey, true);
    if (rawOutput) {
      const parsed = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
      parsedOpps = parsed?.opportunities || parsed?.items || [];
    }
  } catch (err) {
    console.error('LLM evaluation error:', err.message);
  }

  // Fallback to keyword scoring if LLM returned nothing
  if (parsedOpps.length === 0 && newPool.length > 0) {
    console.log('Using heuristic fallback for top opportunities.');
    parsedOpps = newPool.slice(0, 2).map(item => ({
      title: item.title,
      url: item.url,
      deadline: null,
      effort: 'med',
      profile_match: 75,
      acceptance_chance: 55,
      project_fit: (item.description || item.title).slice(0, 200),
      what_offered: 'Funded opportunity'
    }));
  }

  const validOpps = parsedOpps.filter(o => o.title && o.url && (o.profile_match === undefined || o.profile_match > 0));
  console.log(`Identified ${validOpps.length} valid opportunities matching criteria.`);

  if (validOpps.length === 0) {
    console.log('No matching opportunities found. Exiting.');
    return;
  }

  // 5. Insert valid opportunities into hardware_opportunities
  const toInsert = validOpps.map(o => ({
    user_id: userId,
    title: o.title,
    url: o.url,
    deadline: (o.deadline && String(o.deadline).match(/^\d{4}-\d{2}-\d{2}$/)) ? o.deadline : null,
    effort: o.effort || 'med',
    profile_match: o.profile_match || 75,
    acceptance_chance: o.acceptance_chance || 50,
    project_fit: o.project_fit || 'Scouted funding/fellowship opportunity',
    what_offered: o.what_offered || 'Grant funding',
    status: 'new'
  }));

  if (isDryRun) {
    console.log('[DRY-RUN] Would insert into hardware_opportunities:', toInsert);
  } else {
    const { error: insertErr } = await safeClient.from('hardware_opportunities').insert(toInsert);
    if (insertErr) {
      console.error('Failed to insert opportunities:', insertErr);
    } else {
      console.log(`Successfully inserted ${toInsert.length} new opportunities into hardware_opportunities.`);
    }
  }

  console.log('Opportunity Scout finished.');
}

if (process.argv[1] && process.argv[1].endsWith('scout_opportunities.js')) {
  run().catch(err => {
    console.error('Fatal scout error:', err);
    process.exit(1);
  });
}
