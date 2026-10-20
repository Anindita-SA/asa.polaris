function cleanLlmContent(text, asJson = false) {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (asJson) {
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    }
  }
  return cleaned;
}

export async function getBestGroqModel(apiKey) {
  const fallback = 'qwen/qwen3.8-27b';
  if (!apiKey) return fallback;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });

    if (!res.ok) {
      return fallback;
    }

    const json = await res.json();
    const availableModels = (json.data || []).map(m => m.id);

    const excludeRegex = /whisper|guard|prompt-guard|safeguard|embed|bge|vision|rerank|orpheus|allam|compound/i;
    const filteredModels = availableModels.filter(id => !excludeRegex.test(id));

    const priorities = [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];

    for (const prefix of priorities) {
      const match = filteredModels.find(m => m.includes(prefix) || m === prefix);
      if (match) {
        return match;
      }
    }

    return filteredModels[0] || fallback;
  } catch (err) {
    return fallback;
  }
}

export async function generateWithFallbackNode(prompt, groqApiKey = null, geminiApiKey = null, options = {}) {
  const isBool = typeof options === 'boolean';
  const asJson = isBool ? options : (options?.asJson || false);
  const preferredModel = isBool ? null : (options?.preferredModel || null);
  const maxOut = isBool ? null : (options?.maxOutputTokens || null);
  const tryOllama = isBool ? false : (options?.tryOllama || false);
  const ollamaModel = (options && !isBool && options.ollamaModel) || 'qwen2.5:3b';

  if (tryOllama) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: prompt,
          stream: false,
          format: asJson ? 'json' : undefined
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const content = json.response ? json.response.trim() : (json.message?.content || '').trim();
        if (content) {
          return cleanLlmContent(content, asJson);
        }
      }
    } catch (ollamaErr) {
      clearTimeout(timeoutId);
    }
  }

  const finalGroqKey = groqApiKey || (typeof process !== 'undefined' ? (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY) : null);
  const finalGeminiKey = geminiApiKey || (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : null);

  if (preferredModel && finalGeminiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const geminiPayload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: asJson ? "application/json" : "text/plain",
          maxOutputTokens: maxOut || 4096
        }
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${preferredModel}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': finalGeminiKey },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          return cleanLlmContent(content, asJson);
        }
      } else {
        console.warn(`Preferred Gemini model ${preferredModel} failed:`, res.status, await res.text());
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`Preferred Gemini model error on ${preferredModel}:`, err);
    }
  }

  // 1. Try Groq with 2-model candidate list and 6s timeout
  if (finalGroqKey) {
    let topModel = 'qwen/qwen3.8-27b';
    try {
      topModel = await getBestGroqModel(finalGroqKey);
    } catch (e) {
      topModel = 'qwen/qwen3.8-27b';
    }

    const groqCandidates = Array.from(new Set([
      topModel,
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b'
    ])).slice(0, 2);

    for (const candidate of groqCandidates) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + finalGroqKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: candidate,
            messages: [{ role: 'user', content: prompt }],
            response_format: asJson ? { type: 'json_object' } : undefined,
            max_tokens: maxOut || 1024,
            temperature: 0.7
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const groqData = await res.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            return cleanLlmContent(content, asJson);
          }
        } else {
          console.warn(`Groq candidate ${candidate} failed:`, res.status, await res.text());
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Groq error on ${candidate}:`, err);
      }
    }
  }

  // 2. Fallback to Gemini cascade (gemini-3.8-flash -> gemini-3.5-flash -> gemini-flash-latest with 8s timeout)
  if (finalGeminiKey) {
    const geminiModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    for (const model of geminiModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const geminiPayload = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: asJson ? "application/json" : "text/plain",
            maxOutputTokens: maxOut || 1024
          }
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': finalGeminiKey },
          body: JSON.stringify(geminiPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            return cleanLlmContent(content, asJson);
          }
        } else {
          console.warn(`Gemini candidate ${model} fallback failed:`, res.status, await res.text());
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Gemini error on ${model}:`, err);
      }
    }
  }

  throw new Error("All LLM providers failed or missing API keys.");
}
