import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { extractJsonFromLlm } from '../_shared/llm_utils.ts'
import { applicationSubtasksPrompt } from '../_shared/personal_prompts.ts'

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Unauthorized')

    const { opportunity, parent_task_id } = await req.json()
    if (!opportunity || !parent_task_id) throw new Error('Missing opportunity or parent_task_id')

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) throw new Error('GROQ_API_KEY is not set')

    const prompt = applicationSubtasksPrompt(opportunity)

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        reasoning_format: 'hidden',
        max_tokens: 1000
      })
    })

    if (!groqRes.ok) throw new Error(`Groq API Error: ${groqRes.status} ${await groqRes.text()}`)

    const groqData = await groqRes.json()
    const parsed = extractJsonFromLlm(groqData.choices[0].message.content)
    const subtasks = parsed.subtasks || []

    if (subtasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No subtasks generated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const tasksToInsert = subtasks.map((st: any) => ({
      user_id: user.id,
      title: st.title,
      parent_task_id: parent_task_id,
      status: 'inbox',
      quadrant: 'important_not_urgent',
      estimated_minutes: st.estimated_minutes || 30,
      estimate_source: 'ai',
      deadline: opportunity.deadline,
      notes: st.notes
    }))

    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, tasks: data }), {
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
