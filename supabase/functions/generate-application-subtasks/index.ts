import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { generateWithFallback } from '../_shared/llm_utils.ts'
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

    // Verify parent task exists and belongs to authenticated user
    const { data: parentTask, error: parentErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', parent_task_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (parentErr || !parentTask) {
      throw new Error('Parent task not found or unauthorized')
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY') || null
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null

    const prompt = applicationSubtasksPrompt(opportunity)

    let subtasks: any[] = []
    try {
      if (groqApiKey || geminiApiKey) {
        const parsed = await generateWithFallback(prompt, groqApiKey, geminiApiKey)
        subtasks = parsed?.subtasks || parsed?.items || []
      }
    } catch (err) {
      console.error("LLM generation failed for application subtasks, applying Tier 3 fallback:", err)
    }

    // Tier 3 canonical application subtask template fallback
    if (subtasks.length === 0) {
      console.log("Tier 3 active: Generating canonical application subtasks")
      subtasks = [
        { title: "Review eligibility & program requirements", time_estimate_minutes: 20, mental_load: "low", notes: "Check criteria, prerequisites, and deadlines." },
        { title: "Prepare academic transcript and CV", time_estimate_minutes: 45, mental_load: "medium", notes: "Tailor CV to opportunity focus areas." },
        { title: "Draft Statement of Purpose (SOP)", time_estimate_minutes: 120, mental_load: "high", notes: "Draft tailored essay connecting background to program." },
        { title: "Request recommendation letters from professors", time_estimate_minutes: 15, mental_load: "low", notes: "Contact professors/mentors with request and summary." },
        { title: "Complete and submit official application form", time_estimate_minutes: 45, mental_load: "medium", notes: "Final review, upload required files, and submit." }
      ]
    }

    const tasksToInsert = subtasks.map((st: any) => {
      const minutes = st.time_estimate_minutes || st.estimated_minutes || 30
      const mentalLoad = ['low', 'medium', 'high'].includes(st.mental_load) ? st.mental_load : 'medium'
      return {
        user_id: user.id,
        title: st.title,
        parent_task_id: parent_task_id,
        status: 'inbox',
        quadrant: 'important_not_urgent',
        estimated_minutes: minutes,
        time_estimate_minutes: minutes,
        mental_load: mentalLoad,
        estimate_source: 'heuristic',
        deadline: opportunity.deadline || null,
        notes: st.notes || null
      }
    })

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
