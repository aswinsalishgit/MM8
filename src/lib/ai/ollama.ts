export async function queryOllama(prompt: string, systemPrompt?: string) {
  const url = process.env.OLLAMA_CLOUD_URL || "http://localhost:11434"; // Defaulting to local if env missing, but intended for cloud
  const model = "qwen3-next";
  
  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI_ENGINE_OFFLINE: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.message?.content || "";
  } catch (err) {
    console.error("MM8_AI_QUERY_FAILURE:", err);
    return "AI_UNAVAILABLE: Check Cloud Connectivity.";
  }
}
