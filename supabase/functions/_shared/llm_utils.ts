
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

