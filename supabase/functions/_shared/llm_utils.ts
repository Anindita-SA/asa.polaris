export function cleanLlmContent(text: string): string {
  if (!text) return "";
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }
  return cleaned;
}

export function extractJsonFromLlm(content: string): any {
  if (!content) return null;
  const cleaned = cleanLlmContent(content);

  // Find boundaries for object {...} or array [...]
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace !== -1) {
      startIndex = firstBrace;
      endIndex = lastBrace + 1;
    }
  } else if (firstBracket !== -1) {
    if (lastBracket !== -1) {
      startIndex = firstBracket;
      endIndex = lastBracket + 1;
    }
  }

  let jsonStr = cleaned;
  if (startIndex !== -1 && endIndex !== -1) {
    jsonStr = cleaned.slice(startIndex, endIndex);
  }

  return JSON.parse(jsonStr);
}

export async function getBestGroqModel(apiKey: string): Promise<string> {
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
    const availableModels = (json.data || []).map((m: any) => m.id);

    const excludeRegex = /whisper|guard|prompt-guard|safeguard|embed|bge|vision|rerank|orpheus|allam|compound/i;
    const filteredModels = availableModels.filter((id: string) => !excludeRegex.test(id));

    const priorities = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'llama3-70b-8192'
    ];

    for (const prefix of priorities) {
      const match = filteredModels.find((m: string) => m.includes(prefix) || m === prefix);
      if (match) {
        return match;
      }
    }

    return filteredModels[0] || fallback;
  } catch (err) {
    return fallback;
  }
}

export async function generateWithFallback(
  promptOrMessages: string | any[],
  groqApiKey: string | null,
  geminiApiKey: string | null,
  asJson: boolean = true,
  maxTokens: number = 2048,
  systemPrompt: string | null = null,
  returnRaw: boolean = false
): Promise<any> {
  let messages: any[] = [];
  let systemText: string | null = systemPrompt || null;

  if (Array.isArray(promptOrMessages)) {
    messages = [...promptOrMessages];
    const sysMsg = messages.find((m: any) => m.role === 'system');
    if (sysMsg && !systemText) {
      systemText = sysMsg.content;
    }
  } else {
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: promptOrMessages });
  }

  // 1. Try Groq First (capped at 2 models max with 6-second timeout per attempt)
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

    for (const model of groqCandidates) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + groqApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: asJson ? { type: 'json_object' } : undefined,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            console.log("LLM Success: Groq", model);
            if (returnRaw) {
              return cleanLlmContent(content);
            }
            return extractJsonFromLlm(content);
          }
        } else {
          console.warn(`Groq candidate ${model} failed:`, res.status, await res.text());
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Groq error on ${model}:`, err);
      }
    }
  }

  // 2. Fallback to Gemini cascade (gemini-3.7-flash -> gemini-3.5-flash with 8s timeout)
  if (geminiApiKey) {
    const nonSystemMessages = messages.filter((m: any) => m.role !== 'system');
    const geminiContents = nonSystemMessages.map((msg: any) => ({
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
        const geminiPayload: any = {
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
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            console.log("LLM Success: Gemini", model);
            if (returnRaw) {
              return cleanLlmContent(content);
            }
            return extractJsonFromLlm(content);
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

  throw new Error("All LLM providers failed.");
}
