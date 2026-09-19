import { supabase } from './supabase';

export function getGroqKey(promptIfMissing = false) {
  const LOCAL_STORAGE_KEY = 'polaris_groq_api_key';
  let key = null;
  try {
    if (typeof localStorage !== 'undefined') {
      key = localStorage.getItem(LOCAL_STORAGE_KEY);
    }
  } catch (e) {}

  if (!key && promptIfMissing && typeof window !== 'undefined' && window.prompt) {
    const entered = window.prompt("Please enter your Groq API Key to enable AI features:");
    if (entered && entered.trim().length > 0) {
      key = entered.trim();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, key);
        }
      } catch (e) {}
    }
  }

  return key ? key.trim() : null;
}

export function getGeminiKey(promptIfMissing = false) {
  const LOCAL_STORAGE_KEY = 'polaris_gemini_api_key';
  let key = null;
  try {
    if (typeof localStorage !== 'undefined') {
      key = localStorage.getItem(LOCAL_STORAGE_KEY);
    }
  } catch (e) {}

  if (!key && promptIfMissing && typeof window !== 'undefined' && window.prompt) {
    const entered = window.prompt("Please enter your Gemini API Key for fallback AI features:");
    if (entered && entered.trim().length > 0) {
      key = entered.trim();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, key);
        }
      } catch (e) {}
    }
  }

  return key ? key.trim() : null;
}

export async function getBestGroqModel(apiKey) {
  const fallback = 'llama-3.3-70b-versatile';
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
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'llama3-70b-8192'
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

function cleanLlmContent(text) {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }
  return cleaned;
}

export async function generateLlmResponse(promptOrMessages, asJson = true, maxTokens = 1024, systemPrompt = null) {
  const groqApiKey = getGroqKey();
  const geminiApiKey = getGeminiKey();

  // 1. If local BYOK keys exist, use direct client-side requests
  if (groqApiKey || geminiApiKey) {
    let messages = [];
    let systemText = systemPrompt || null;

    if (Array.isArray(promptOrMessages)) {
      messages = [...promptOrMessages];
      const sysMsg = messages.find(m => m.role === 'system');
      if (sysMsg && !systemText) {
        systemText = sysMsg.content;
      }
    } else {
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: promptOrMessages });
    }

    // Try Groq with 2-model candidate list and 6s timeout
    if (groqApiKey) {
      let topModel = 'llama-3.3-70b-versatile';
      try {
        topModel = await getBestGroqModel(groqApiKey);
      } catch (e) {
        topModel = 'llama-3.3-70b-versatile';
      }

      const groqCandidates = Array.from(new Set([
        topModel,
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant'
      ])).slice(0, 2);

      for (const candidate of groqCandidates) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + groqApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: candidate,
              messages: messages,
              response_format: asJson ? { type: 'json_object' } : undefined,
              max_tokens: maxTokens
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data?.choices?.[0]?.message?.content) {
              data.choices[0].message.content = cleanLlmContent(data.choices[0].message.content);
              return data;
            }
          } else {
            console.warn(`Groq candidate ${candidate} failed:`, res.status, await res.text());
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.error(`Groq error with ${candidate}:`, err);
        }
      }
    }

    // Fallback cascade to Gemini (gemini-3.7-flash -> gemini-3.5-flash with 8s timeout)
    if (geminiApiKey) {
      const nonSystemMessages = messages.filter(m => m.role !== 'system');
      const geminiContents = nonSystemMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : (msg.role === 'assistant' ? 'model' : 'user'),
        parts: [{ text: msg.content }]
      }));

      if (geminiContents.length === 0 && systemText) {
        geminiContents.push({ role: 'user', parts: [{ text: systemText }] });
      }

      const geminiModels = ['gemini-3.7-flash', 'gemini-3.5-flash'];

      for (const model of geminiModels) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const geminiPayload = {
            contents: geminiContents,
            generationConfig: {
              responseMimeType: asJson ? "application/json" : "text/plain",
              maxOutputTokens: maxTokens
            }
          };

          if (systemText) {
            geminiPayload.system_instruction = { parts: [{ text: systemText }] };
          }

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawContent) {
              const cleaned = cleanLlmContent(rawContent);
              return { choices: [{ message: { content: cleaned } }] };
            }
          } else {
            console.warn(`Gemini candidate ${model} fallback failed:`, res.status, await res.text());
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.error(`Gemini error with ${model}:`, err);
        }
      }
    }

    throw new Error("All local BYOK LLM providers failed.");
  }

  // 2. If no local BYOK key, invoke server-side proxy
  try {
    const { data, error } = await supabase.functions.invoke('llm-proxy', {
      body: {
        promptOrMessages,
        asJson,
        maxTokens,
        systemPrompt
      }
    });

    if (error) {
      throw new Error(error.message || 'Server LLM proxy failed');
    }

    if (data?.choices?.[0]?.message?.content !== undefined) {
      data.choices[0].message.content = cleanLlmContent(data.choices[0].message.content);
      return data;
    }

    throw new Error('Invalid response structure from LLM proxy');
  } catch (proxyErr) {
    throw new Error(`LLM proxy failed: ${proxyErr.message || proxyErr}`);
  }
}
