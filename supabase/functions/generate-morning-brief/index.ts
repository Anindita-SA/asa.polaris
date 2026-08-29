import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Parser from 'npm:rss-parser'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Unauthorized: Missing Authorization header')
    }
    const token = authHeader.replace(/^Bearer\s+/i, '')

    // Create client with the user's token so RLS policies pass for subsequent queries
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      throw new Error(`Unauthorized: ${authError?.message || 'No user found'}`)
    }

    // 1.5 Parse request body to check for 'force' flag
    let force = false;
    try {
      const body = await req.json();
      force = body.force === true;
    } catch (e) {
      // ignore JSON parse error if body is empty
    }

    // 2. Check if today's brief already exists (unless forced)
    const today = new Date().toLocaleDateString('en-CA')
    if (!force) {
      const { data: existingBrief } = await supabaseClient
        .from('morning_briefs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

      if (existingBrief) {
        return new Response(JSON.stringify({ message: 'Brief already exists for today' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // 3. Fetch all active sources for the user
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('brief_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)

    if (sourcesError) throw sourcesError
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ message: 'No active sources found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Fetch past briefs to filter curated URLs
    const { data: pastBriefs } = await supabaseClient
      .from('morning_briefs')
      .select('items')
      .eq('user_id', user.id)

    const usedUrls = new Set(
      (pastBriefs || []).flatMap(b => (b.items || []).map((i: any) => i.url).filter(Boolean))
    )

    // 5. Gather items from sources
    const pool = []
    const parser = new Parser()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    for (const source of sources) {
      if (source.type === 'curated' && source.manual_summary) {
        if (!usedUrls.has(source.url)) {
          pool.push({
            title: source.name,
            url: source.url,
            source_name: source.name,
            summary: source.manual_summary
          })
        }
      } else if (source.type === 'fixed') {
        try {
          const feed = await parser.parseURL(source.url)
          let count = 0
          for (const item of feed.items) {
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
            if (pubDate >= fourteenDaysAgo) {
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

    // 6. Call Groq
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY secret is not set')
    }

    // Minify pool to save tokens (strip overly long summaries if needed, but we'll send as is for now)
    const minifiedPool = pool.map(i => ({
      title: i.title,
      url: i.url,
      source_name: i.source_name,
      summary: (i.summary || '').substring(0, 500) // truncate large XML contents
    }))

    const prompt = `Here is a pool of recent developments, news, and opportunities:
${JSON.stringify(minifiedPool)}

Pick the 3 most exciting and relevant developments or opportunities from this pool. 
You MUST meticulously prioritize a mix of the following: 
1. Opportunities: Paid volunteer work (especially UN), internships, or startup job positions that align with my goals (EE, Robotics, Agri-tech, sustainable products, hardware engineering, TU Delft prep). Focus heavily on dates/deadlines (they must be fairly new with time to apply).
2. News: Conservation tech breakthroughs, conservation effort successes and failures, sustainable ecosystems, and agri-tech. (Do NOT just pick generic tech breakthrough news).

Write a tightened 1-2 sentence summary for each.
You MUST strictly use the exact 'title', 'url', and 'source_name' provided in the pool for your chosen items. DO NOT invent or modify those fields.

Return ONLY valid JSON in this exact format:
{"items": [{"title": "Exact Title", "summary": "1-2 sentences...", "source_name": "Exact Source", "url": "Exact URL"}]}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        max_tokens: 1024
      })
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Groq API Error: ${res.status} ${res.statusText} ${errBody}`)
    }

    const data = await res.json()
    let items = []
    
    let content = data.choices[0].message.content
    // Remove <think> blocks if present
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    
    // Extract just the JSON object
    const firstBrace = content.indexOf('{')
    const lastBrace = content.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      content = content.slice(firstBrace, lastBrace + 1)
    }

    const parsed = JSON.parse(content)
    items = parsed.items || []

    if (items.length > 0) {
      // 7. Insert into morning_briefs
      if (force) {
        const { error: delErr } = await supabaseClient
          .from('morning_briefs')
          .delete()
          .eq('user_id', user.id)
          .eq('date', today)
        
        if (delErr) {
          console.error("Warning: Failed to delete existing brief before force-inserting:", delErr)
        }
      }

      const { error: insertErr } = await supabaseClient.from('morning_briefs').insert({
        user_id: user.id,
        date: today,
        items: items.slice(0, 3), // Ensure max 3
        seen: false
      })

      if (insertErr) throw insertErr

      return new Response(JSON.stringify({ success: true, items }), {
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
