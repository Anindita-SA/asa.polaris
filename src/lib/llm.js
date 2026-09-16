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
    const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } })
    if (!res.ok) return 'llama-3.1-70b-versatile'
    const json = await res.json()
    const availableModels = json.data.map(m => m.id)
    const priorities = ['llama-3.3-70b', 'llama-3.1-70b', 'llama3-70b', 'qwen-2.5-32b', 'mixtral-8x7b', 'llama-3.3', 'llama-3.1', 'llama']
    for (const prefix of priorities) {
      const match = availableModels.find(m => m.includes(prefix))
      if (match) return match
    }
    return availableModels[0] || 'llama-3.1-70b-versatile'
  } catch (err) {
    return 'llama-3.1-70b-versatile'
  }
}

