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

    // Fallback RSS feeds if empty
    let activeSources = sources || []
    if (activeSources.length === 0) {
      activeSources = [
        { type: 'fixed', name: 'Hakai Magazine', url: 'https://hakaimagazine.com/feed/' },
        { type: 'fixed', name: 'Mongabay India', url: 'https://india.mongabay.com/feed/' },
        { type: 'fixed', name: 'Mongabay Global', url: 'https://news.mongabay.com/feed/' },
        { type: 'fixed', name: 'Phys.org Biotechnology', url: 'https://phys.org/rss-feed/biology-news/biotechnology/' },
        { type: 'fixed', name: 'The Conversation Health', url: 'https://theconversation.com/global/health/articles.atom' },
        { type: 'fixed', name: 'Wildlabs', url: 'https://wildlabs.net/feed' },
        { type: 'fixed', name: 'Innovation Origins', url: 'https://innovationorigins.com/en/feed/' }
      ]
    }

    const { data: pastBriefs, error: pastBriefsError } = await supabaseClient
      .from('morning_briefs')
      .select('date, items')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (pastBriefsError) throw pastBriefsError

    const usedUrls = new Set(
      (pastBriefs || []).flatMap((b: any) => (b.items || []).map((i: any) => i.url).filter(Boolean))
    )

    // Identify yesterday's (or most recent past day's) news coverage for anti-repeat logic
    const mostRecentPastBrief = (pastBriefs || []).find((b: any) => b.date < today && Array.isArray(b.items))
    const previousNewsItems = (mostRecentPastBrief?.items || []).filter((i: any) => i.type === 'news' || (!i.type && !i.hardware_opportunity_id))
    const yesterdayCategories = Array.from(new Set(
      previousNewsItems.map((i: any) => i.category).filter(Boolean)
    ))
    const previousCoverage = previousNewsItems
      .map((i: any) => `- ${i.category ? `[${i.category}] ` : ''}${i.title} (${i.source_name || i.source || 'News'})`)
      .join('\n')

    const SOURCE_TO_CATEGORY: Record<string, string> = {
      'Hakai Magazine': 'Marine & ocean conservation',
      'Phys.org Biotechnology': 'Biotechnology & genetic engineering',
      'The Conversation Health': 'Health & medicine',
      'Wildlabs': 'Conservation tech & wildlife monitoring',
      'Mongabay India': 'Community-led conservation & grassroots environmental change',
      'Mongabay Global': 'Community-led conservation & grassroots environmental change',
      'Innovation Origins': 'Sustainable agriculture & bio-tech ecosystems'
    }

    const pool = []
    const parser = new Parser()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    for (const source of activeSources) {
      if (source.type === 'curated' && source.manual_summary) {
        if (!usedUrls.has(source.url)) {
          pool.push({ title: source.name, url: source.url, source_name: source.name, summary: source.manual_summary })
        }
      } else if (source.type === 'fixed') {
        try {
          const feed = await parser.parseURL(source.url)
          let count = 0
          for (const item of feed.items) {
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
            if (pubDate >= fourteenDaysAgo && !usedUrls.has(item.link)) {
              const rawText = item.contentSnippet || item.content || item.summary || item.title || ''
              const cleanText = rawText.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()
              pool.push({
                title: (item.title || '').trim(),
                url: item.link || '',
                source_name: source.name,
                summary: cleanText.length > 180 ? cleanText.slice(0, 177) + '...' : cleanText
              })
              count++
              if (count >= 2) break // Token optimization: max 2 items per feed
            }
          }
        } catch (err) {
          console.error(`Failed to fetch/parse feed ${source.url}:`, err)
        }
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

    // Token optimization: Compact candidate payload without URLs (saves tokens)
    const minifiedPool = pool.map((i, idx) => ({
      id: idx,
      title: i.title,
      source: i.source_name,
      summary: i.summary
    }))

    const prompt = newsPrompt(JSON.stringify(minifiedPool), previousCoverage, yesterdayCategories)
  
    let parsedItems: any[] = []
    try {
      if (groqApiKey || geminiApiKey) {
        const parsed = await generateWithFallback(prompt, groqApiKey, geminiApiKey, true, 512)
        parsedItems = parsed?.items || []
      }
    } catch (err) {
      console.error("Failed LLM generation or parsing, falling back to Tier 3 RSS synthesis:", err)
    }

    // Tier 3 heuristic fallback: Diverse selection across distinct domains and sources
    if (parsedItems.length === 0 && pool.length > 0) {
      console.log("Tier 3 RSS fallback active: generating brief directly from distinct RSS pool items.")
      const excludedCats = new Set(yesterdayCategories)
      const selected: any[] = []
      const chosenCategories = new Set<string>()

      // First pass: Pick items whose domain was NOT covered yesterday
      for (const item of pool) {
        const cat = SOURCE_TO_CATEGORY[item.source_name] || 'General Breakthrough'
        if (!excludedCats.has(cat) && !chosenCategories.has(cat) && selected.length < 3) {
          selected.push({ ...item, category: cat })
          chosenCategories.add(cat)
        }
      }

      // Second pass: If still under 3, pick from remaining available categories not yet chosen today
      for (const item of pool) {
        const cat = SOURCE_TO_CATEGORY[item.source_name] || 'General Breakthrough'
        if (selected.length < 3 && !chosenCategories.has(cat) && !selected.some(s => s.url === item.url)) {
          selected.push({ ...item, category: cat })
          chosenCategories.add(cat)
        }
      }

      // Third pass: Fill up to 3 if pool has fewer than 3 categories
      for (const item of pool) {
        if (selected.length < 3 && !selected.some(s => s.url === item.url)) {
          const cat = SOURCE_TO_CATEGORY[item.source_name] || 'General Breakthrough'
          selected.push({ ...item, category: cat })
        }
      }

      parsedItems = selected.map(item => ({
        title: item.title,
        summary: item.summary || item.title,
        url: item.url,
        source_name: item.source_name,
        category: item.category
      }))
    }
    
    // Tag with type="news" and retain category, matching back to pool items
    const newsItems = parsedItems.slice(0, 3).map((i: any) => {
      let matchedPoolItem = null
      if (typeof i.id === 'number' && pool[i.id]) {
        matchedPoolItem = pool[i.id]
      } else if (i.url) {
        matchedPoolItem = pool.find(p => p.url === i.url)
      } else if (i.title) {
        matchedPoolItem = pool.find(p => p.title.toLowerCase() === i.title.toLowerCase())
      }

      return {
        title: i.title || matchedPoolItem?.title || '',
        summary: i.summary || matchedPoolItem?.summary || '',
        url: matchedPoolItem?.url || i.url || '',
        source_name: matchedPoolItem?.source_name || i.source_name || i.source || 'News',
        category: i.category || (matchedPoolItem ? SOURCE_TO_CATEGORY[matchedPoolItem.source_name] : 'General Breakthrough'),
        type: 'news'
      }
    }).filter(i => i.title && i.url)

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
