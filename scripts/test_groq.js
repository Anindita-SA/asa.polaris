import 'dotenv/config';
async function test() {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': 'Bearer ' + process.env.VITE_GROQ_API_KEY }
  });
  const json = await res.json();
  const availableModels = json.data.map(m => m.id);
  console.log('Available models:', availableModels);
  
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
      const match = availableModels.find(m => m.includes(prefix));
      if (match) {
        console.log('Match for ' + prefix + ': ' + match);
        return;
      }
    }
}
test();
