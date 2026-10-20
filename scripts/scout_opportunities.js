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

STEP 1 - PAGE TYPE CLASSIFICATION:
For each item, determine if the page is:
- "application": A direct application or call-for-proposals page with submission instructions
- "aggregator": A listicle, newsletter, blog roundup, or portal listing multiple opportunities
- "info": A press release, news article, org homepage, or general info page
- "expired": Deadline has clearly passed

ONLY items classified as "application" may proceed. Reject all others.

STEP 2 - ELIGIBILITY & REALISTIC SCORING:
- Bangladeshi nationals must be eligible (reject if restricted to other regions/citizenships or requires Indian citizenship/residency).
- Must have funding (reject self-funded or paid fee programs).
- If unconfirmed, note in project_fit instead of rejecting outright.

CRITICAL SCORING & OUTPUT RULES:
- DO NOT use default scores like 80/85 or 60. Calibrate realistic numbers:
  * profile_match (0-100): Alignment with applicant background and citizenship (90+ = exact match with EEE/design/conservation and verified Bangladesh eligibility, 60-80 = moderate alignment, <50 = weak alignment).
  * acceptance_chance (0-100): Realistic selection probability based on competition (competitive international programs are typically 10-35%).
- what_offered: Specify exact funding terms, grant amount, stipend, or travel terms (e.g. '$20,000 research grant', 'Full tuition + €1,400/month stipend'). NEVER output vague text like 'Travel and project funding' or 'Grant funding'.
- project_fit: Generate a clean 2-3 sentence structured summary:
  Sentence 1 (Program Overview): Program scope, focus, and host organization.
  Sentence 2-3 (Strategic Fit & Eligibility): Direct alignment with applicant background (hardware/EEE, product design/art, or certified technical training) and nationality/visa eligibility confirmation.
- effort: low (simple form) | med (1-2 essays/portfolio) | high (multi-stage/interview).

Pick 0-3 best fits. Return ZERO if nothing qualifies - an empty array is the correct answer when no direct applications match.
${learnedFeedback ? `\nLEARNED REJECTIONS (DO NOT REPEAT):\n${learnedFeedback}\n` : ''}
JSON only, no preamble/fences:
{"opportunities":[{"id":0,"title":"","deadline":"YYYY-MM-DD or null","effort":"low|med|high","profile_match":72,"acceptance_chance":25,"project_fit":"","what_offered":""}],"rejected":[{"id":0,"title":"","reason":"aggregator|info|expired|ineligible"}]}`;
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

  // 4. Evaluate candidates via LLM (Token optimization: 300 chars max, omit URLs)
  const minifiedPool = newPool.slice(0, 5).map((item, idx) => ({
    id: idx,
    title: item.title,
    description: (item.description || item.title).slice(0, 300),
    source: item.source_name
  }));

  const prompt = buildOpportunitiesPrompt(minifiedPool, learnedFeedback);
  let parsedOpps = [];

  try {
    const rawOutput = await generateWithFallbackNode(prompt, config.groqApiKey, config.geminiApiKey, { asJson: true, maxOutputTokens: 768 });
    if (rawOutput) {
      const parsed = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
      parsedOpps = parsed?.opportunities || parsed?.items || [];
    }
  } catch (err) {
    console.error('LLM evaluation error:', err.message);
  }

  // Map parsed opportunities back to newPool candidates to resolve URL
  const enrichedOpps = parsedOpps.map(o => {
    let matchedItem = null;
    if (typeof o.id === 'number' && newPool[o.id]) {
      matchedItem = newPool[o.id];
    } else if (o.url) {
      matchedItem = newPool.find(p => p.url === o.url);
    } else if (o.title) {
      matchedItem = newPool.find(p => p.title.toLowerCase() === o.title.toLowerCase());
    }

    return {
      ...o,
      title: o.title || matchedItem?.title || '',
      url: matchedItem?.url || o.url || ''
    };
  }).filter(o => o.title && o.url);

  const validOpps = enrichedOpps.filter(o => o.profile_match === undefined || o.profile_match > 20);
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
    effort: ['low', 'med', 'high'].includes(o.effort) ? o.effort : 'med',
    profile_match: typeof o.profile_match === 'number' ? Math.min(100, Math.max(0, o.profile_match)) : 70,
    acceptance_chance: typeof o.acceptance_chance === 'number' ? Math.min(100, Math.max(0, o.acceptance_chance)) : 30,
    project_fit: o.project_fit || 'Scouted fellowship or funding opportunity matching applicant profile.',
    what_offered: o.what_offered || 'See program call for full award terms.',
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
