import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { extractJsonFromLlm, getBestGroqModel, generateWithFallback } from '../_shared/llm_utils.ts'
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
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const targetUserId = Deno.env.get('TARGET_USER_ID')

    if (!firecrawlApiKey) throw new Error('Configuration error: Missing firecrawl key')
    if (!groqApiKey) throw new Error('Configuration error: Missing groq key')
    if (!serviceRoleKey) throw new Error('Configuration error: Missing database key')
    if (!targetUserId) throw new Error('Configuration error: Missing target user')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Create admin client bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    if (token !== serviceRoleKey) {
      const { data: { user: callerUser }, error: authErr } = await supabaseAdmin.auth.getUser(token)
      if (authErr || !callerUser || callerUser.id !== targetUserId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    const user = { id: targetUserId }
    const today = new Date().toLocaleDateString('en-CA')



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
        hardware_opportunity_id: o.id,
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
          await supabaseAdmin.from('morning_briefs').update({ items: updatedItems }).eq('id', existingBrief.id).eq('user_id', user.id)
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

    // 2. Query Groq with Learned Rejection Feedback
    const { data: rejectedFeedback } = await supabaseAdmin
      .from('hardware_opportunities')
      .select('title, rejection_reason')
      .eq('user_id', user.id)
      .eq('status', 'rejected')
      .not('rejection_reason', 'is', null)
      .order('rejected_at', { ascending: false, nullsFirst: false })
      .limit(6)

    let learnedFeedback = ''
    if (rejectedFeedback && rejectedFeedback.length > 0) {
      learnedFeedback = rejectedFeedback
        .filter(rf => rf.rejection_reason && rf.rejection_reason.trim())
        .map(rf => `- ${rf.title}: ${rf.rejection_reason.trim()}`)
        .join('\n')
    }

    const minifiedPool = searchResults.slice(0, 5).map((r: any) => ({
      title: r.title, url: r.url, 
      content: r.markdown ? r.markdown.substring(0, 1500) : r.description
    }))

    const prompt = opportunitiesPrompt(JSON.stringify(minifiedPool), learnedFeedback);
  
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null;
    let parsedOpps = []
    try {
      const parsed = await generateWithFallback(prompt, groqApiKey, geminiApiKey);
      parsedOpps = parsed.opportunities || parsed.items || []
    } catch (err) {
      console.error("Failed LLM generation or parsing:", err)
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

    const { data: insertedRows, error: insertErr } = await supabaseAdmin
      .from('hardware_opportunities')
      .insert(opsToInsert)
      .select('id, title, url, project_fit, profile_match, acceptance_chance')

    if (insertErr) throw insertErr

    // 5. Append to morning_briefs
    const briefItems = (insertedRows || []).map((o: any) => ({
      title: o.title,
      url: o.url,
      source_name: 'Firecrawl Scout',
      summary: o.project_fit,
      type: 'opportunity',
      hardware_opportunity_id: o.id,
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
      await supabaseAdmin.from('morning_briefs').update({ items: updatedItems }).eq('id', existingBrief.id).eq('user_id', user.id)
    } else {
      await supabaseAdmin.from('morning_briefs').insert({
        user_id: user.id, date: today, items: briefItems, seen: false
      })
    }

    return new Response(JSON.stringify({ success: true, inserted: insertedRows?.length || 0 }), {
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
