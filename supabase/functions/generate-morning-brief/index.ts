import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Parser from 'npm:rss-parser'
import { extractJsonFromLlm, getBestGroqModel, generateWithFallback } from '../_shared/llm_utils.ts'
import { newsPrompt } from '../_shared/personal_prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!serviceRoleKey) throw new Error('Configuration error: Missing database key')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let resolvedUserId: string | null = null

    let isServiceRole = false
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role === 'service_role') isServiceRole = true
    } catch (e) {}

    if (!isServiceRole && token !== serviceRoleKey) {
      const { data: { user: callerUser }, error: authErr } = await supabaseClient.auth.getUser(token)
      if (authErr || !callerUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      resolvedUserId = callerUser.id
    } else {
      const envTarget = Deno.env.get('TARGET_USER_ID')
      if (envTarget) {
        resolvedUserId = envTarget
      } else {
        const { data: profiles, error: profilesError } = await supabaseClient.from('profiles').select('id').limit(1)
        if (profilesError) throw profilesError
        if (profiles && profiles.length > 0) {
          resolvedUserId = profiles[0].id
        }
      }
    }

    if (!resolvedUserId) {
      throw new Error('Configuration error: Missing target user')
    }

    const user = { id: resolvedUserId }

    let force = false
    try {
      const body = await req.json()
      force = body.force === true
    } catch (e) {}

    const today = new Date().toLocaleDateString('en-CA')
    
    // Check for existing brief
    const { data: existingBrief, error: existingBriefError } = await supabaseClient
      .from('morning_briefs')
      .select('id, items')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (existingBriefError) throw existingBriefError

    // Fetch active sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('brief_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)

    if (sourcesError) throw sourcesError

    const CANONICAL_PILLARS = [
      'Biotechnology & genetic engineering',
      'Health & medicine',
      'Marine & ocean conservation',
      'Community & grassroots ecology',
      'Tech & field implementation'
    ] as const

    type CanonicalPillar = typeof CANONICAL_PILLARS[number]

    const SOURCE_TO_PILLAR: Record<string, CanonicalPillar> = {
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
    }

    const DEFAULT_FEEDS_BY_PILLAR: Record<CanonicalPillar, Array<{ name: string; url: string; type: string }>> = {
      'Biotechnology & genetic engineering': [
        { type: 'fixed', name: 'Phys.org Biotechnology', url: 'https://phys.org/rss-feed/biology-news/biotechnology/' }
      ],
      'Health & medicine': [
        { type: 'fixed', name: 'The Conversation Health', url: 'https://theconversation.com/global/health/articles.atom' }
      ],
      'Marine & ocean conservation': [
        { type: 'fixed', name: 'Ocean Conservancy', url: 'https://oceanconservancy.org/feed/' },
        { type: 'fixed', name: 'Phys.org Oceanography', url: 'https://phys.org/rss-feed/earth-news/oceanography/' }
      ],
      'Community & grassroots ecology': [
        { type: 'fixed', name: 'Mongabay India', url: 'https://india.mongabay.com/feed/' },
        { type: 'fixed', name: 'Mongabay Global', url: 'https://news.mongabay.com/feed/' }
      ],
      'Tech & field implementation': [
        { type: 'fixed', name: 'AgFunderNews', url: 'https://agfundernews.com/feed' },
        { type: 'fixed', name: 'Phys.org Engineering', url: 'https://phys.org/rss-feed/technology-news/engineering/' }
      ]
    }

    function isAnimalOrWildlifeStory(item?: { title?: string; summary?: string }): boolean {
      if (!item) return false
      const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase()
      const animalPattern = /\b(animal|animals|wildlife|fauna|fish|fishes|mammal|mammals|bird|birds|reptile|reptiles|amphibian|amphibians|primate|primates|shark|sharks|whale|whales|ray|rays|tiger|tigers|elephant|elephants|insect|insects|bear|bears|wolf|wolves|frog|frogs|turtle|turtles|coral|corals|zooplankton|crustacean|crustaceans|subterranean fishes)\b/i
      const nonAnimalContext = /\b(patient|patients|clinical trial|human health|hospital|cancer|vaccine|blood|diagnostic|wearable|sensor|sensors|crop|crops|grain|wheat|rice|forestry|satellite|irrigation)\b/i
      if (animalPattern.test(text) && !nonAnimalContext.test(text)) {
        return true
      }
      return false
    }

    function cleanSummary(text?: string): string {
      let s = (text || '').replace(/\s+/g, ' ').trim()
      if (s.endsWith('...')) {
        s = s.slice(0, -3).trim()
        const lastPeriod = s.lastIndexOf('.')
        if (lastPeriod > 40) {
          s = s.slice(0, lastPeriod + 1)
        }
      }
      return s
    }

    function normalizeToPillar(str?: string): CanonicalPillar | null {
      if (!str) return null
      const s = String(str).toLowerCase()
      if (
        s.includes('biotech') ||
        s.includes('genetic') ||
        s.includes('cellular') ||
        s.includes('phys.org biology') ||
        s.includes('tissue engineering')
      ) {
        return 'Biotechnology & genetic engineering'
      }
      if (
        s.includes('health') ||
        s.includes('medicine') ||
        s.includes('medical') ||
        s.includes('vaccine') ||
        s.includes('disease') ||
        s.includes('conversation health')
      ) {
        return 'Health & medicine'
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
        return 'Marine & ocean conservation'
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
        return 'Community & grassroots ecology'
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
        return 'Tech & field implementation'
      }
      return null
    }

    // Fallback RSS feeds if empty
    let activeSources = sources || []
    if (activeSources.length === 0) {
      activeSources = [
        ...DEFAULT_FEEDS_BY_PILLAR['Biotechnology & genetic engineering'],
        ...DEFAULT_FEEDS_BY_PILLAR['Health & medicine'],
        ...DEFAULT_FEEDS_BY_PILLAR['Marine & ocean conservation'],
        ...DEFAULT_FEEDS_BY_PILLAR['Community & grassroots ecology'],
        ...DEFAULT_FEEDS_BY_PILLAR['Tech & field implementation']
      ]
    }

    const { data: pastBriefs, error: pastBriefsError } = await supabaseClient
      .from('morning_briefs')
      .select('date, items')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (pastBriefsError) throw pastBriefsError

    // Exclude today's items from usedUrls if force is true so fresh candidate generation is unblocked
    const usedUrls = new Set(
      (pastBriefs || [])
        .filter((b: any) => force ? b.date < today : true)
        .flatMap((b: any) => (b.items || []).map((i: any) => i.url).filter(Boolean))
    )

    // Identify yesterday's (or most recent past day's) news coverage for anti-repeat logic
    const mostRecentPastBrief = (pastBriefs || []).find((b: any) => b.date < today && Array.isArray(b.items))
    const previousNewsItems = (mostRecentPastBrief?.items || []).filter(
      (i: any) => i.type === 'news' || (!i.type && !i.hardware_opportunity_id)
    )

    const yesterdayPillars = new Set<CanonicalPillar>()
    for (const item of previousNewsItems) {
      const p =
        normalizeToPillar(item.pillar) ||
        normalizeToPillar(item.category) ||
        (item.source_name ? SOURCE_TO_PILLAR[item.source_name] : null) ||
        normalizeToPillar(item.source_name || item.source)
      if (p) yesterdayPillars.add(p)
    }

    const freshPillars = CANONICAL_PILLARS.filter(p => !yesterdayPillars.has(p))
    const previousCoverage = previousNewsItems
      .map((i: any) => `- ${i.category || i.pillar ? `[${i.pillar || i.category}] ` : ''}${i.title} (${i.source_name || i.source || 'News'})`)
      .join('\n')

    interface CandidateItem {
      id?: number
      title: string
      url: string
      source_name: string
      summary: string
      pillar: CanonicalPillar
      category: CanonicalPillar
    }

    const itemsByPillar = new Map<CanonicalPillar, CandidateItem[]>()
    for (const pillar of CANONICAL_PILLARS) {
      itemsByPillar.set(pillar, [])
    }

    const parser = new Parser({
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    })
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    const fetchFeedItems = async (
      sourceName: string,
      sourceUrl: string,
      targetPillar: CanonicalPillar,
      maxItems: number = 2
    ) => {
      try {
        const feed = await parser.parseURL(sourceUrl)
        let added = 0
        for (const item of (feed.items || [])) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
          const link = (item.link || item.guid || '').trim()
          if (link && pubDate >= fourteenDaysAgo && !usedUrls.has(link)) {
            const currentList = itemsByPillar.get(targetPillar) || []
            if (currentList.some(existing => existing.url === link)) continue

            const rawText = item.contentSnippet || item.content || item.summary || item.title || ''
            const cleanText = rawText.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()
            currentList.push({
              title: (item.title || '').trim(),
              url: link,
              source_name: sourceName,
              summary: cleanText.length > 180 ? cleanText.slice(0, 177) + '...' : cleanText,
              pillar: targetPillar,
              category: targetPillar
            })
            itemsByPillar.set(targetPillar, currentList)
            added++
            if (added >= maxItems) break
          }
        }
      } catch (err: any) {
        console.warn(`Failed to fetch/parse feed ${sourceName} (${sourceUrl}):`, err.message || err)
      }
    }

    // Process user configured sources with per-pillar caps
    for (const source of activeSources) {
      const pillar =
        SOURCE_TO_PILLAR[source.name] ||
        normalizeToPillar(source.name) ||
        normalizeToPillar(source.url) ||
        'Community & grassroots ecology'

      const currentList = itemsByPillar.get(pillar) || []
      if (currentList.length >= 2) continue

      if (source.type === 'curated' && source.manual_summary) {
        if (!usedUrls.has(source.url) && !currentList.some(e => e.url === source.url)) {
          currentList.push({
            title: source.name,
            url: source.url,
            source_name: source.name,
            summary: source.manual_summary,
            pillar,
            category: pillar
          })
          itemsByPillar.set(pillar, currentList)
        }
      } else if (source.type === 'fixed') {
        const needed = 2 - currentList.length
        await fetchFeedItems(source.name, source.url, pillar, Math.min(2, needed))
      }
    }

    // Resilience guarantee: if any canonical pillar has 0 items, query default fallback feeds
    for (const pillar of CANONICAL_PILLARS) {
      const currentList = itemsByPillar.get(pillar) || []
      if (currentList.length === 0) {
        const backups = DEFAULT_FEEDS_BY_PILLAR[pillar] || []
        for (const backup of backups) {
          if (itemsByPillar.get(pillar)!.length >= 2) break
          await fetchFeedItems(backup.name, backup.url, pillar, 2)
        }
      }
    }

    // Assemble balanced candidate pool (max 2 items per pillar)
    const pool: CandidateItem[] = []
    for (const pillar of CANONICAL_PILLARS) {
      const candidates = itemsByPillar.get(pillar) || []
      for (const item of candidates.slice(0, 2)) {
        item.id = pool.length
        pool.push(item)
      }
    }

    if (pool.length === 0) {
      return new Response(JSON.stringify({ message: 'No new items in pool' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY') || null
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null

    // Compact candidate payload without URLs (saves tokens)
    const minifiedPool = pool.map((i) => ({
      id: i.id,
      title: i.title,
      source: i.source_name,
      pillar: i.pillar,
      summary: i.summary
    }))

    const prompt = newsPrompt(
      JSON.stringify(minifiedPool),
      previousCoverage,
      Array.from(yesterdayPillars),
      freshPillars
    )

    let parsedItems: any[] = []
    try {
      if (groqApiKey || geminiApiKey) {
        const parsed = await generateWithFallback(prompt, groqApiKey, geminiApiKey, true, 512)
        parsedItems = parsed?.items || []
      }
    } catch (err) {
      console.error("Failed LLM generation or parsing, falling back to Tier 3 RSS synthesis:", err)
    }

    // Hard Programmatic Diversity & Anti-Repeat Selection Function
    function selectDiverseNewsItems(
      llmItems: any[],
      candidatePool: CandidateItem[],
      usedYesterday: Set<CanonicalPillar>,
      uncoveredPillars: CanonicalPillar[]
    ): CandidateItem[] {
      const selected: CandidateItem[] = []
      const selectedPillars = new Set<CanonicalPillar>()
      const selectedSources = new Set<string>()
      const selectedUrls = new Set<string>()
      let selectedAnimalCount = 0
      let selectedYesterdayCount = 0

      const yesterdaySet = usedYesterday instanceof Set
        ? usedYesterday
        : new Set(usedYesterday || [])

      const availableFreshPillars = (uncoveredPillars || []).filter(fresh =>
        candidatePool.some(candidate => candidate.pillar === fresh)
      )

      // Anti-repeat constraint: If fresh pillars are available, limit yesterday's repeats
      const maxYesterdayAllowed = Math.max(1, 3 - availableFreshPillars.length)

      const parseId = (id: any) => {
        if (typeof id === 'number') return id
        if (typeof id === 'string' && /^\d+$/.test(id.trim())) return parseInt(id.trim(), 10)
        return null
      }

      const normalizeTitle = (title?: string) =>
        (title || '').toLowerCase().replace(/['"‘’“”]/g, '').replace(/\s+/g, ' ').trim()

      // 1. Process and validate LLM candidate picks
      for (const item of llmItems) {
        if (selected.length >= 3) break

        let matched: CandidateItem | undefined = undefined
        const parsedId = parseId(item.id)
        if (parsedId !== null && candidatePool[parsedId]) {
          matched = candidatePool[parsedId]
        } else if (item.url) {
          matched = candidatePool.find(p => p.url === item.url)
        } else if (item.title) {
          const cleanTarget = normalizeTitle(item.title)
          matched = candidatePool.find(p => {
            const cleanP = normalizeTitle(p.title)
            return cleanP === cleanTarget || cleanP.includes(cleanTarget) || cleanTarget.includes(cleanP)
          })
        }

        if (!matched) continue

        // Reject duplicate pillar, duplicate source, or duplicate URL
        if (
          selectedPillars.has(matched.pillar) ||
          selectedSources.has(matched.source_name) ||
          selectedUrls.has(matched.url)
        ) {
          continue
        }

        // Anti-repeat constraint: Don't repeat yesterday's pillars if fresh pillars are available
        const isFromYesterday = yesterdaySet.has(matched.pillar)
        if (isFromYesterday && selectedYesterdayCount >= maxYesterdayAllowed) {
          continue
        }

        // Animal anti-clustering constraint: Max 1 animal/wildlife story across brief
        const isAnimal = isAnimalOrWildlifeStory(matched)
        if (isAnimal && selectedAnimalCount >= 1) {
          continue
        }

        const rawSummary = (item.summary && item.summary.trim().length > 20)
          ? item.summary.trim()
          : matched.summary

        selected.push({
          ...matched,
          summary: cleanSummary(rawSummary)
        })
        selectedPillars.add(matched.pillar)
        selectedSources.add(matched.source_name)
        selectedUrls.add(matched.url)
        if (isAnimal) selectedAnimalCount++
        if (isFromYesterday) selectedYesterdayCount++
      }

      // 2. Programmatic Backfill
      // Pass A: Unrepresented fresh pillars from yesterday (anti-repeat rotation)
      for (const freshPillar of (uncoveredPillars || [])) {
        if (selected.length >= 3) break
        if (selectedPillars.has(freshPillar)) continue

        const candidate = candidatePool.find(p =>
          p.pillar === freshPillar &&
          !selectedSources.has(p.source_name) &&
          !selectedUrls.has(p.url) &&
          (!isAnimalOrWildlifeStory(p) || selectedAnimalCount < 1)
        )
        if (candidate) {
          selected.push({
            ...candidate,
            summary: cleanSummary(candidate.summary)
          })
          selectedPillars.add(candidate.pillar)
          selectedSources.add(candidate.source_name)
          selectedUrls.add(candidate.url)
          if (isAnimalOrWildlifeStory(candidate)) selectedAnimalCount++
        }
      }

      // Pass B: Any other unrepresented canonical pillar not yet selected today
      for (const pillar of CANONICAL_PILLARS) {
        if (selected.length >= 3) break
        if (selectedPillars.has(pillar)) continue

        const candidate = candidatePool.find(p =>
          p.pillar === pillar &&
          !selectedSources.has(p.source_name) &&
          !selectedUrls.has(p.url) &&
          (!isAnimalOrWildlifeStory(p) || selectedAnimalCount < 1)
        )
        if (candidate) {
          selected.push({
            ...candidate,
            summary: cleanSummary(candidate.summary)
          })
          selectedPillars.add(candidate.pillar)
          selectedSources.add(candidate.source_name)
          selectedUrls.add(candidate.url)
          if (isAnimalOrWildlifeStory(candidate)) selectedAnimalCount++
        }
      }

      // Pass C: Relax animal constraint if no non-animal candidate is available for unrepresented pillars
      for (const pillar of CANONICAL_PILLARS) {
        if (selected.length >= 3) break
        if (selectedPillars.has(pillar)) continue

        const candidate = candidatePool.find(p =>
          p.pillar === pillar &&
          !selectedSources.has(p.source_name) &&
          !selectedUrls.has(p.url)
        )
        if (candidate) {
          selected.push({
            ...candidate,
            summary: cleanSummary(candidate.summary)
          })
          selectedPillars.add(candidate.pillar)
          selectedSources.add(candidate.source_name)
          selectedUrls.add(candidate.url)
        }
      }

      // Pass D: Relax source constraint if pool has fewer than 3 sources
      for (const item of candidatePool) {
        if (selected.length >= 3) break
        if (!selectedPillars.has(item.pillar) && !selectedUrls.has(item.url)) {
          selected.push({
            ...item,
            summary: cleanSummary(item.summary)
          })
          selectedPillars.add(item.pillar)
          selectedSources.add(item.source_name)
          selectedUrls.add(item.url)
        }
      }

      // Pass E: Emergency fallback if pool has fewer than 3 pillars total
      for (const item of candidatePool) {
        if (selected.length >= 3) break
        if (!selectedUrls.has(item.url)) {
          selected.push({
            ...item,
            summary: cleanSummary(item.summary)
          })
          selectedUrls.add(item.url)
        }
      }

      return selected
    }

    const finalSelected = selectDiverseNewsItems(parsedItems, pool, yesterdayPillars, freshPillars)

    const newsItems = finalSelected.map(item => ({
      title: item.title,
      summary: item.summary,
      url: item.url,
      source_name: item.source_name,
      category: item.pillar,
      pillar: item.pillar,
      type: 'news'
    })).filter(i => i.title && i.url)

    if (newsItems.length > 0) {
      if (existingBrief) {
        // Keep existing non-news items (like type="opportunity"), append new news items
        const nonNewsItems = (existingBrief.items || []).filter((i: any) => i.type !== 'news')
        if (force) {
          // If force, we wipe old news and add new ones
          const newItems = [...nonNewsItems, ...newsItems]
          const { error: updateErr } = await supabaseClient.from('morning_briefs').update({ items: newItems }).eq('id', existingBrief.id).eq('user_id', user.id)
          if (updateErr) throw updateErr
        } else {
          // If not force, and we already have news, don't generate more
          const hasNews = (existingBrief.items || []).some((i: any) => i.type === 'news')
          if (hasNews) {
            return new Response(JSON.stringify({ message: 'Brief already has news items for today' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          } else {
             const newItems = [...nonNewsItems, ...newsItems]
             const { error: updateErr } = await supabaseClient.from('morning_briefs').update({ items: newItems }).eq('id', existingBrief.id).eq('user_id', user.id)
             if (updateErr) throw updateErr
          }
        }
      } else {
        const { error: insertErr } = await supabaseClient.from('morning_briefs').insert({
          user_id: user.id, date: today, items: newsItems, seen: false
        })
        if (insertErr) throw insertErr
      }

      return new Response(JSON.stringify({ success: true, items: newsItems }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ message: 'No items could be generated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error: any) {
    console.error('Edge Function Error:', error.message || error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
