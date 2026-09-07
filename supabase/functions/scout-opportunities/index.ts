import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { extractJsonFromLlm } from '../_shared/llm_utils.ts'
import { opportunitiesPrompt } from '../_shared/personal_prompts.ts'

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

    // Helper function to append previous highly recommended opportunities
    const appendPreviousOpps = async (reason: string) => {
      console.log(`No new opps (${reason}), fetching previous ones...`)
      const { data: previousOpps } = await supabaseAdmin
        .from('hardware_opportunities')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(3)

      if (!previousOpps || previousOpps.length === 0) {
        return new Response(JSON.stringify({ message: `${reason}, and no previous opportunities found` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      const briefItems = previousOpps.map((o: any) => ({
        title: o.title,
        url: o.url,
        source_name: 'Previous Scout',
        summary: o.project_fit || 'Highly recommended from previous scout.',
        type: 'opportunity',
        is_previous: true,
        profile_match: o.profile_match,
        acceptance_chance: o.acceptance_chance
      }))

      const { data: existingBrief } = await supabaseAdmin
        .from('morning_briefs')
        .select('id, items')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

      let insertedCount = 0;
      if (existingBrief) {
        const existingItems = existingBrief.items || []
        const existingUrls = new Set(existingItems.map((i: any) => i.url))
        const itemsToAdd = briefItems.filter((item: any) => !existingUrls.has(item.url))

        if (itemsToAdd.length > 0) {
          const updatedItems = [...existingItems, ...itemsToAdd]
          await supabaseAdmin.from('morning_briefs').update({ items: updatedItems }).eq('id', existingBrief.id)
          insertedCount = itemsToAdd.length;
        }
      } else {
        await supabaseAdmin.from('morning_briefs').insert({
          user_id: user.id, date: today, items: briefItems, seen: false
        })
        insertedCount = briefItems.length;
      }

      return new Response(JSON.stringify({ success: true, message: `Appended ${insertedCount} previous opportunities (${reason})` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 1. Search Firecrawl
    const query = "fully funded international travel OR global field expeditions OR conservation tech OR robotics OR UN programs grants funding opportunities"
    const firecrawlRes = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        limit: 5,
        tbs: 'qdr:w',
        scrapeOptions: { formats: ["markdown"] }
      })
    })

    if (!firecrawlRes.ok) {
      throw new Error(`Firecrawl API Error: ${firecrawlRes.status} ${await firecrawlRes.text()}`)
    }

    const firecrawlData = await firecrawlRes.json()
    const searchResults = firecrawlData.data || []
    
    if (searchResults.length === 0) {
      return await appendPreviousOpps('No results from Firecrawl')
    }

    // 2. Query Groq
    const minifiedPool = searchResults.slice(0, 5).map((r: any) => ({
      title: r.title, url: r.url, 
      content: r.markdown ? r.markdown.substring(0, 2000) : r.description
    }))

    const prompt = opportunitiesPrompt(JSON.stringify(minifiedPool));

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        max_tokens: 800
      })
    })

    if (!groqRes.ok) throw new Error(`Groq API Error: ${groqRes.status} ${await groqRes.text()}`)

    const groqData = await groqRes.json()
    let parsedOpps = []
    try {
      const parsed = extractJsonFromLlm(groqData.choices[0].message.content)
      parsedOpps = parsed.opportunities || []
    } catch (err) {
      console.error("Failed to parse LLM JSON:", err)
    }

    if (parsedOpps.length === 0) {
      return await appendPreviousOpps('Groq returned no opportunities')
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
      return await appendPreviousOpps('All found opportunities already exist in the database')
    }

    // 4. Insert into hardware_opportunities
    const opsToInsert = newOpps.map((o: any) => ({
      user_id: user.id,
      title: o.title,
      url: o.url,
      deadline: (o.deadline && String(o.deadline).match(/^\d{4}-\d{2}-\d{2}$/)) ? o.deadline : null,
      effort: o.effort || 'med',
      profile_match: o.profile_match,
      acceptance_chance: o.acceptance_chance,
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
      type: 'opportunity',
      profile_match: o.profile_match,
      acceptance_chance: o.acceptance_chance
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
