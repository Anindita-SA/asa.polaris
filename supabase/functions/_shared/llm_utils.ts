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
      return 'groq/compound'; // fallback
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

    // Ultimate fallback if no priorities match (filter out non-text/guard models)
    const textModels = availableModels.filter((m: string) => !m.includes('whisper') && !m.includes('guard'));
    return textModels[0] || 'groq/compound';
  } catch (err) {
    return 'groq/compound';
  }
}
