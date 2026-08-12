const { getStore } = require('@netlify/blobs');
const { DEFAULT_SYSTEM_PROMPT, STORE_NAME, PROMPT_KEY } = require('./_shared');

exports.handler = async (event) => {
  const adminPassword = process.env.ADMIN_PROMPT_PASSWORD || 'purplebox2026';
  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    const password = event.queryStringParameters && event.queryStringParameters.password;
    if (password !== adminPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password' }) };
    }
    let prompt = DEFAULT_SYSTEM_PROMPT;
    try {
      const saved = await store.get(PROMPT_KEY);
      if (saved) prompt = saved;
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Storage unavailable', detail: String(e) }) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, isDefault: prompt === DEFAULT_SYSTEM_PROMPT }),
    };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    if (body.password !== adminPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password' }) };
    }
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'prompt required' }) };
    }

    try {
      await store.set(PROMPT_KEY, body.prompt.trim());
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Storage unavailable', detail: String(e) }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
