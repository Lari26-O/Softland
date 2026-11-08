/**
 * Softland AI server (Cloudflare Worker).
 * Holds the API keys as secrets so everyone can use the app without their own key.
 * Tries providers in order and falls back to the next one if a provider fails or hits its limit:
 *   1. Google Gemini   (secret: GEMINI_API_KEY)
 *   2. Groq            (secret: GROQ_API_KEY)
 *   3. OpenRouter      (secret: OPENROUTER_API_KEY)
 * Any provider without a key is skipped.
 *
 * Optional plain-text variables:
 *   ALLOWED_ORIGINS  comma-separated sites allowed to use this server
 *                    (default: https://lari26-o.github.io)
 *   GEMINI_MODEL, GROQ_MODEL, OPENROUTER_MODEL  to change models without editing code
 */

const DEFAULT_ORIGINS = 'https://lari26-o.github.io';
const MAX_BODY = 40_000;          // characters per request
const PER_MINUTE = 20;            // requests per visitor per minute (best effort)
const hits = new Map();

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method === 'GET') return reply({ ok: true, name: 'Softland AI server', providers: providers(env).map(p => p.name) });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    if (!okOrigin) return reply({ error: 'This server only works from the Softland app.' }, 403);

    // light rate limit per visitor (per Worker instance; best effort)
    const ip = request.headers.get('CF-Connecting-IP') || 'anon';
    const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 60_000);
    if (list.length >= PER_MINUTE) return reply({ error: 'Slow down a little — try again in a minute.' }, 429);
    list.push(now); hits.set(ip, list);
    if (hits.size > 5000) hits.clear();

    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply({ error: 'Message too long.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'Bad request' }, 400); }
    const system = String(body.system || '').slice(0, 8000);
    const json = !!body.json;
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-20)
      .map(m => ({ role: m.role === 'ai' ? 'ai' : 'user', text: String(m.text || '').slice(0, 6000) }))
      .filter(m => m.text);
    if (!messages.length) return reply({ error: 'Empty message' }, 400);

    const list2 = providers(env);
    if (!list2.length) return reply({ error: 'The Softland server has no AI keys set up yet.' }, 500);
    const tried = [];
    for (const p of list2) {
      try {
        const text = await p.call({ system, messages, json });
        if (text && text.trim()) return reply({ text: text.trim(), provider: p.name });
        tried.push(`${p.name}: empty reply`);
      } catch (e) {
        tried.push(`${p.name}: ${e.message}`);
      }
    }
    return reply({ error: 'All AI services are busy right now. Try again in a minute.', tried }, 503);
  }
};

function providers(env) {
  const out = [];
  if (env.GEMINI_API_KEY) out.push({ name: 'gemini', call: a => gemini(env, a) });
  if (env.GROQ_API_KEY) out.push({ name: 'groq', call: a => openaiStyle('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, env.GROQ_MODEL || 'llama-3.3-70b-versatile', a) });
  if (env.OPENROUTER_API_KEY) out.push({ name: 'openrouter', call: a => openaiStyle('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL || 'openrouter/free', a, { 'HTTP-Referer': 'https://lari26-o.github.io/Softland/', 'X-Title': 'Softland' }) });
  return out;
}

async function withTimeout(url, init, ms = 25_000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'timed out' : 'network error'); }
  finally { clearTimeout(t); }
}

async function gemini(env, { system, messages, json }) {
  const models = [...new Set([env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-2.5-flash'])];
  let last;
  for (const model of models) {
    const res = await withTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] })),
        generationConfig: { temperature: 0.85, ...(json ? { responseMimeType: 'application/json' } : {}) }
      })
    });
    if (res.status === 404) { last = new Error(`model ${model} not found`); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  }
  throw last || new Error('no model');
}

async function openaiStyle(url, key, model, { system, messages, json }, extraHeaders = {}) {
  const res = await withTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      messages: [
        { role: 'system', content: system + (json ? '\nRespond with valid JSON only, no other text.' : '') },
        ...messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {})
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
