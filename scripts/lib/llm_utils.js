export async function getBestGroqModel(apiKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    
    if (!res.ok) {
      return 'llama-3.1-70b-versatile'; // fallback
    }

    const json = await res.json();
    const availableModels = json.data.map(m => m.id);

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
      const match = availableModels.find(m => m.includes(prefix));
      if (match) {
        return match;
      }
    }

    const textModels = availableModels.filter(m => !m.includes('whisper') && !m.includes('guard'));
    return textModels[0] || 'llama-3.1-70b-versatile';
  } catch (err) {
    return 'llama-3.1-70b-versatile';
  }
}

export async function generateWithFallbackNode(prompt, groqApiKey, geminiApiKey, asJson = false) {
  // Try Groq First
  if (groqApiKey) {
    try {
      const dynamicModel = await getBestGroqModel(groqApiKey);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: dynamicModel,
          messages: [{ role: 'user', content: prompt }],
          response_format: asJson ? { type: 'json_object' } : undefined,
          reasoning_effort: 'none',
          reasoning_format: 'hidden',
          max_tokens: 2048,
          temperature: 0.7
        })
      });
      
      if (res.ok) {
        const groqData = await res.json();
        return groqData.choices[0].message.content.trim();
      }
      console.warn("Groq script failed:", res.status, await res.text());
    } catch (err) {
      console.error('Groq script error:', err);
    }
  }

  // Fallback to Gemini
  if (geminiApiKey) {
    try {
      const model = 'gemini-3.7-flash';
      const geminiPayload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: asJson ? "application/json" : "text/plain",
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
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
      console.warn("Gemini script fallback failed:", res.status, await res.text());
    } catch (err) {
      console.error('Gemini script error:', err);
    }
  }

  throw new Error("All LLM providers failed or missing API keys.");
}
