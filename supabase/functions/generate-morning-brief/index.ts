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
        { type: 'fixed', name: 'Wildlabs', url: 'https://www.wildlabs.net/feed' },
        { type: 'fixed', name: 'Mongabay India', url: 'https://india.mongabay.com/feed/' },
        { type: 'fixed', name: 'AgFunderNews', url: 'https://agfundernews.com/feed' },
        { type: 'fixed', name: 'Innovation Origins', url: 'https://innovationorigins.com/en/feed/' }
      ]
    }

    const { data: pastBriefs, error: pastBriefsError } = await supabaseClient
      .from('morning_briefs')
      .select('items')
      .eq('user_id', user.id)

    if (pastBriefsError) throw pastBriefsError

    const usedUrls = new Set(
      (pastBriefs || []).flatMap((b: any) => (b.items || []).map((i: any) => i.url).filter(Boolean))
    )

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
              pool.push({
                title: item.title || '',
                url: item.link || '',
                source_name: source.name,
                summary: item.contentSnippet || item.content || item.summary || ''
              })
              count++
              if (count >= 5) break
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

    const minifiedPool = pool.map(i => ({
      title: i.title, url: i.url, source_name: i.source_name, summary: (i.summary || '').substring(0, 500)
    }))

    const prompt = newsPrompt(JSON.stringify(minifiedPool))
  
    let parsedItems = []
    try {
      if (groqApiKey || geminiApiKey) {
        const parsed = await generateWithFallback(prompt, groqApiKey, geminiApiKey)
        parsedItems = parsed?.items || []
      }
    } catch (err) {
      console.error("Failed LLM generation or parsing, falling back to Tier 3 RSS synthesis:", err)
    }

    // Tier 3 heuristic fallback: Directly pick top 3 RSS pool items
    if (parsedItems.length === 0 && pool.length > 0) {
      console.log("Tier 3 RSS fallback active: generating brief directly from top RSS pool items.")
      parsedItems = pool.slice(0, 3).map(item => {
        const cleanSummary = (item.summary || item.title || '')
          .replace(/<[^>]*>?/gm, '')
          .replace(/\s+/g, ' ')
          .trim()
        const truncated = cleanSummary.length > 160 ? cleanSummary.slice(0, 157) + '...' : cleanSummary
        return {
          title: item.title,
          summary: truncated || item.title,
          url: item.url,
          source: item.source_name
        }
      })
    }
    
    // Tag with type="news"
    const newsItems = parsedItems.slice(0, 3).map((i: any) => ({ ...i, type: 'news' }))

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
