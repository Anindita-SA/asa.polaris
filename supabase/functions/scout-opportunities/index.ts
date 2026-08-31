import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    
    // Create admin client bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const targetUserId = Deno.env.get('TARGET_USER_ID')
    if (!targetUserId) throw new Error('TARGET_USER_ID is not set in secrets')

    const user = { id: targetUserId }
    const today = new Date().toLocaleDateString('en-CA')

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) throw new Error('FIRECRAWL_API_KEY is not set')

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) throw new Error('GROQ_API_KEY is not set')

    // 1. Search Firecrawl
    const query = "conservation tech OR robotics OR UN programs grants funding hardware opportunities"
    const firecrawlRes = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        limit: 10
      })
    })

    if (!firecrawlRes.ok) {
      throw new Error(`Firecrawl API Error: ${firecrawlRes.status} ${await firecrawlRes.text()}`)
    }

    const firecrawlData = await firecrawlRes.json()
    const searchResults = firecrawlData.data || []
    
    if (searchResults.length === 0) {
      return new Response(JSON.stringify({ message: 'No results from Firecrawl' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Query Groq
    const minifiedPool = searchResults.map((r: any) => ({
      title: r.title, url: r.url, snippet: r.description
    }))

    const prompt = `Here is a pool of opportunities found online:
${JSON.stringify(minifiedPool)}

Pick the 2 to 3 most relevant hardware/conservation/robotics/UN opportunities.
CRITICAL CONSTRAINTS:
1. Must be eligible for Bangladeshi nationality.
2. Must be eligible for a student currently on a student visa in India.
3. Must require ZERO self-funding (must be fully funded, grant, paid, or zero-cost).
4. If an opportunity does not explicitly state it meets these requirements, or if it is ambiguous, explicitly flag that requirement in the 'project_fit' field.

Return ONLY valid JSON in this exact format:
{"opportunities": [{"title": "Exact Title", "url": "Exact URL", "deadline": "YYYY-MM-DD or null if not found", "effort": "low, med, or high", "project_fit": "Why it fits and any flagged missing constraints", "what_offered": "Funding, mentorship, etc."}]}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    if (!groqRes.ok) throw new Error(`Groq API Error: ${groqRes.status} ${await groqRes.text()}`)

    const groqData = await groqRes.json()
    let content = groqData.choices[0].message.content.trim()
    const firstBrace = content.indexOf('{')
    const lastBrace = content.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) content = content.slice(firstBrace, lastBrace + 1)
    
    let parsedOpps = JSON.parse(content).opportunities || []

    if (parsedOpps.length === 0) {
      return new Response(JSON.stringify({ message: 'Groq returned no opportunities' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Idempotency Check
    const urls = parsedOpps.map((o: any) => o.url).filter(Boolean)
    let existingUrls = new Set()
    
    if (urls.length > 0) {
      const { data: existingOpps } = await supabaseAdmin
        .from('hardware_opportunities')
        .select('url')
        .eq('user_id', user.id)
        .in('url', urls)
        
      if (existingOpps) {
        existingOpps.forEach((o: any) => existingUrls.add(o.url))
      }
    }

    const newOpps = parsedOpps.filter((o: any) => !existingUrls.has(o.url))

    if (newOpps.length === 0) {
      return new Response(JSON.stringify({ message: 'All found opportunities already exist in the database' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Insert into hardware_opportunities
    const opsToInsert = newOpps.map((o: any) => ({
      user_id: user.id,
      title: o.title,
      url: o.url,
      deadline: o.deadline,
      effort: o.effort || 'med',
      project_fit: o.project_fit,
      what_offered: o.what_offered,
      status: 'new'
    }))

    const { error: insertErr } = await supabaseAdmin
      .from('hardware_opportunities')
      .insert(opsToInsert)

    if (insertErr) throw insertErr

    // 5. Append to morning_briefs
    const briefItems = newOpps.map((o: any) => ({
      title: o.title,
      url: o.url,
      source_name: 'Firecrawl Scout',
      summary: o.project_fit,
      type: 'opportunity'
    }))

    const { data: existingBrief } = await supabaseAdmin
      .from('morning_briefs')
      .select('id, items')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (existingBrief) {
      const existingItems = existingBrief.items || []
      const updatedItems = [...existingItems, ...briefItems]
      await supabaseAdmin.from('morning_briefs').update({ items: updatedItems }).eq('id', existingBrief.id)
    } else {
      await supabaseAdmin.from('morning_briefs').insert({
        user_id: user.id, date: today, items: briefItems, seen: false
      })
    }

    return new Response(JSON.stringify({ success: true, inserted: newOpps.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Edge Function Error:', error.message || error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
