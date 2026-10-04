const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-5.6-sol';

function extractText(data) {
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

export async function askGateway(messages, options = {}) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    throw new Error('AI Gateway authentication is unavailable for this deployment.');
  }

  const model = process.env.MCLAIN_AGENT_MODEL || DEFAULT_MODEL;
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: options.maxTokens || 3000,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    const detail = data?.error?.message || ('Gateway returned HTTP ' + response.status);
    throw new Error(detail);
  }

  const text = extractText(data);
  if (!text) throw new Error('The agent model returned an empty response.');
  return { text, model: data?.model || model };
}

export function parseJsonObject(text) {
  const clean = String(text || '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {}

  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch {}
  }

  return null;
}
