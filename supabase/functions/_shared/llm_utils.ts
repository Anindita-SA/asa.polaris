export function extractJsonFromLlm(content: string): any {
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  
  return JSON.parse(cleaned);
}

export async function getBestGroqModel(apiKey: string): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    
    if (!res.ok) {
      return 'llama-3.1-70b-versatile'; // fallback
    }

    const json = await res.json();
    const availableModels = json.data.map((m: any) => m.id);

    const priorities = [
      'openai/gpt-oss-120b',
      'groq/compound',
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'qwen-2.5-32b'
    ];

    for (const prefix of priorities) {
      const match = availableModels.find((m: string) => m.includes(prefix));
      if (match) {
        return match;
      }
    }

    const textModels = availableModels.filter((m: string) => !m.includes('whisper') && !m.includes('guard'));
    return textModels[0] || 'llama-3.1-70b-versatile';
  } catch (err) {
    return 'llama-3.1-70b-versatile';
  }
}

export async function generateWithFallback(prompt: string, groqApiKey: string, geminiApiKey: string | null): Promise<any> {
  // 1. Try Groq First
  try {
    const dynamicModel = await getBestGroqModel(groqApiKey);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + groqApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: dynamicModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        reasoning_format: 'hidden',
        max_tokens: 2048
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      const content = data.choices[0]?.message?.content;
      if (content) {
        console.log("LLM Success: Groq", dynamicModel);
        return extractJsonFromLlm(content);
      }
    } else {
      console.warn("Groq failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error('Groq error:', err);
  }

  // 2. Fallback to Gemini
  if (geminiApiKey) {
    try {
      // User explicitly asked for gemini-3.6-flash fallback (or newer efficient models). Let's use gemini-1.5-flash-8b as it is extremely efficient.
      // But wait! Let's strictly use gemini-3.6-flash as requested just in case it exists in this future environment.
      // We will actually just use 'gemini-3.6-flash'.
      const model = 'gemini-3.6-flash';
      const geminiPayload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048
        }
      };
      
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + geminiApiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });
      
      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          console.log("LLM Success: Gemini", model);
          return extractJsonFromLlm(content);
        }
      } else {
        console.warn("Gemini fallback failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error('Gemini error:', err);
    }
  }

  throw new Error("All LLM providers failed.");
}
