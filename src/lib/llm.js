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

    // Ultimate fallback if no priorities match (filter out non-text/guard models)
    const textModels = availableModels.filter(m => !m.includes('whisper') && !m.includes('guard'));
    return textModels[0] || 'llama-3.1-70b-versatile';
  } catch (err) {
    return 'llama-3.1-70b-versatile';
  }
}
