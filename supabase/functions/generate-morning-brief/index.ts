import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Parser from 'npm:rss-parser'
import { extractJsonFromLlm } from '../_shared/llm_utils.ts'

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
    const targetUserId = Deno.env.get('TARGET_USER_ID')

    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    if (!targetUserId) throw new Error('TARGET_USER_ID is not set in secrets')

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const user = { id: targetUserId };

    let force = false;
    try {
      const body = await req.json();
      force = body.force === true;
    } catch (e) {}

    const today = new Date().toLocaleDateString('en-CA')
    
    // Check for existing brief
    const { data: existingBrief } = await supabaseClient
      .from('morning_briefs')
      .select('id, items')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    // We no longer abort if existingBrief is found. We append.
    
    // Fetch active sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('brief_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)

    if (sourcesError) throw sourcesError

    // Fallback RSS feeds if empty
    let activeSources = sources || [];
    if (activeSources.length === 0) {
      activeSources = [
        { type: 'fixed', name: 'Wildlabs', url: 'https://www.wildlabs.net/feed' },
        { type: 'fixed', name: 'The Revelator', url: 'https://www.therevelator.org/feed' },
        { type: 'fixed', name: 'TechCrunch Climate', url: 'https://techcrunch.com/tag/climate/feed/' },
        { type: 'fixed', name: 'Mongabay', url: 'https://news.mongabay.com/feed/' }
      ];
    }

    const { data: pastBriefs } = await supabaseClient
      .from('morning_briefs')
      .select('items')
      .eq('user_id', user.id)

    const usedUrls = new Set(
      (pastBriefs || []).flatMap(b => (b.items || []).map((i: any) => i.url).filter(Boolean))
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

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) throw new Error('GROQ_API_KEY secret is not set')

    const minifiedPool = pool.map(i => ({
      title: i.title, url: i.url, source_name: i.source_name, summary: (i.summary || '').substring(0, 500)
    }))

    const prompt = `Here is a pool of recent news and developments:
${JSON.stringify(minifiedPool)}

Pick the 3 most exciting and relevant developments from this pool. 
You MUST meticulously prioritize conservation tech breakthroughs, sustainable ecosystems, agri-tech, and climate action. DO NOT pick opportunities or job postings. DO NOT just pick generic tech breakthrough news.

Write a tightened 1-2 sentence summary for each.
You MUST strictly use the exact 'title', 'url', and 'source_name' provided in the pool for your chosen items.

Return ONLY valid JSON in this exact format:
{"items": [{"title": "Exact Title", "summary": "1-2 sentences...", "source_name": "Exact Source", "url": "Exact URL"}]}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        max_tokens: 1024
      })
    })

    if (!res.ok) throw new Error(`Groq API Error: ${res.status} ${await res.text()}`)

    const data = await res.json()
    let parsedItems = []
    try {
      const parsed = extractJsonFromLlm(data.choices[0].message.content)
      parsedItems = parsed.items || []
    } catch (err) {
      console.error("Failed to parse LLM JSON:", err)
    }
    
    // Tag with type="news"
    const newsItems = parsedItems.slice(0, 3).map((i: any) => ({ ...i, type: 'news' }))

    if (newsItems.length > 0) {
      if (existingBrief) {
        // Keep existing non-news items (like type="opportunity"), append new news items
        const nonNewsItems = (existingBrief.items || []).filter((i: any) => i.type !== 'news');
        if (force) {
          // If force, we wipe old news and add new ones
          const newItems = [...nonNewsItems, ...newsItems];
          const { error: updateErr } = await supabaseClient.from('morning_briefs').update({ items: newItems }).eq('id', existingBrief.id);
          if (updateErr) throw updateErr;
        } else {
          // If not force, and we already have news, don't generate more
          const hasNews = (existingBrief.items || []).some((i: any) => i.type === 'news');
          if (hasNews) {
            return new Response(JSON.stringify({ message: 'Brief already has news items for today' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          } else {
             const newItems = [...nonNewsItems, ...newsItems];
             const { error: updateErr } = await supabaseClient.from('morning_briefs').update({ items: newItems }).eq('id', existingBrief.id);
             if (updateErr) throw updateErr;
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
      return new Response(JSON.stringify({ message: 'Groq returned no items' }), {
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
