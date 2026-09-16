
/**
 * Extracts and parses a JSON object from an LLM response string.
 * It strips <think> reasoning tags and locates the outermost JSON brackets.
 */
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
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch Groq models: ${res.status}`);
      return 'llama-3.1-70b-versatile'; // fallback
    }

    const json = await res.json();
    const availableModels = json.data.map((m: any) => m.id);

    const priorities = [
      'llama-3.3-70b',
      'llama-3.1-70b',
      'llama3-70b',
      'qwen-2.5-32b',
      'mixtral-8x7b',
      'llama-3.3',
      'llama-3.1',
      'llama',
      'qwen'
    ];

    for (const prefix of priorities) {
      const match = availableModels.find((m: string) => m.includes(prefix));
      if (match) {
        console.log(`Self-healing resolved Groq model: ${match}`);
        return match;
      }
    }

    // Ultimate fallback if no priorities match
    console.log(`Self-healing resolved fallback Groq model: ${availableModels[0]}`);
    return availableModels[0] || 'llama-3.1-70b-versatile';
  } catch (err) {
    console.error('Error fetching Groq models:', err);
    return 'llama-3.1-70b-versatile';
  }
}
