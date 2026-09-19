import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { generateWithFallback } from '../_shared/llm_utils.ts'

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

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY') || null
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null

    const body = await req.json()
    const { prompt, messages, asJson = true, maxTokens = 1024, systemPrompt = null, promptOrMessages } = body

    const targetInput = messages || prompt || promptOrMessages || ''
    if (!targetInput || (Array.isArray(targetInput) && targetInput.length === 0)) {
      return new Response(JSON.stringify({ error: 'Missing prompt or messages payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const content = await generateWithFallback(
      targetInput,
      groqApiKey,
      geminiApiKey,
      asJson !== false,
      maxTokens || 1024,
      systemPrompt || null,
      true
    )

    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('LLM Proxy Error:', error.message || error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown LLM proxy error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
