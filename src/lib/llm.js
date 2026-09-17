export function getGroqKey() {
  const LOCAL_STORAGE_KEY = 'polaris_groq_api_key'
  let key = localStorage.getItem(LOCAL_STORAGE_KEY)
  
  if (!key) {
    key = window.prompt("Please enter your Groq API Key to enable AI features:")
    if (key && key.trim().length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim())
    } else {
      console.warn("Groq API Key not provided. AI features will be disabled.")
      return null
    }
  }
  
  return key.trim()
}

export function getGeminiKey() {
  const LOCAL_STORAGE_KEY = 'polaris_gemini_api_key'
  let key = localStorage.getItem(LOCAL_STORAGE_KEY)
  
  if (!key) {
    key = window.prompt("Please enter your Gemini API Key for fallback AI features:")
    if (key && key.trim().length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim())
    } else {
      console.warn("Gemini API Key not provided.")
      return null
    }
  }
  
  return key.trim()
}

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

export async function generateLlmResponse(promptOrMessages, asJson = true, maxTokens = 1024, systemPrompt = null) {
  const groqApiKey = getGroqKey();
  
  let messages = [];
  if (Array.isArray(promptOrMessages)) {
    messages = promptOrMessages;
  } else {
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: promptOrMessages });
  }

  // Try Groq First
  if (groqApiKey) {
    try {
      const dynamicModel = await getBestGroqModel(groqApiKey);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: dynamicModel,
          messages: messages,
          response_format: asJson ? { type: 'json_object' } : undefined,
          reasoning_effort: 'none',
          reasoning_format: 'hidden',
          max_tokens: maxTokens
        })
      });
      
      if (res.ok) {
        return await res.json();
      }
      console.warn("Groq frontend failed:", res.status, await res.text());
    } catch (err) {
      console.error('Groq frontend error:', err);
    }
  }

  // Fallback to Gemini
  const geminiApiKey = getGeminiKey();
  if (geminiApiKey) {
    try {
      // Map OpenAI messages format to Gemini format
      const geminiContents = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : (msg.role === 'assistant' ? 'model' : 'user'),
        parts: [{ text: msg.content }]
      }));
      // Note: Gemini has system_instruction, but for simplicity here we just pass it as a user message if it was system
      
      const model = 'gemini-3.7-flash';
      const geminiPayload = {
        contents: geminiContents,
        generationConfig: {
          responseMimeType: asJson ? "application/json" : "text/plain",
          maxOutputTokens: maxTokens
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
          // Normalize to match OpenAI/Groq response format for frontend components
          return { choices: [{ message: { content: content } }] };
        }
      }
      console.warn("Gemini frontend fallback failed:", res.status, await res.text());
    } catch (err) {
      console.error('Gemini frontend error:', err);
    }
  }

  throw new Error("All LLM providers failed or missing API keys.");
}
