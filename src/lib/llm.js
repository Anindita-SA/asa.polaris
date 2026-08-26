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
