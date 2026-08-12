const { getStore } = require('@netlify/blobs');
const { DEFAULT_SYSTEM_PROMPT, STORE_NAME, PROMPT_KEY } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'messages required' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  try {
    const store = getStore(STORE_NAME);
    const saved = await store.get(PROMPT_KEY);
    if (saved) systemPrompt = saved;
  } catch (e) {
    // Blobs not reachable — fall back to the default prompt.
  }

  if (!apiKey) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply:
          "Thanks for reaching out! Our AI assistant isn't fully connected yet — the team is setting it up. In the meantime, call +971 54 224 9946 or WhatsApp us and a live agent will help you pick the right storage size.",
        mock: true,
      }),
    };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.6,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'OpenAI request failed', detail: errText }),
      };
    }

    const data = await res.json();
    const reply =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content && data.choices[0].message.content.trim()) ||
      "Sorry, I couldn't generate a reply just now. Please call +971 54 224 9946.";

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', detail: String(e) }) };
  }
};
