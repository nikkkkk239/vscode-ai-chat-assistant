
export async function callGeminiAPI(messages: { role: string, content: string }[]): Promise<string> {
  const API_KEY = 'AIzaSyBvjq35WF-Uq3C7leila2RDoknvBa2fZLo';

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    })
  });

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Gemini API error or no response.";
}
