import { getVercelOidcToken } from '@vercel/oidc';

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const DEFAULT_MODELS = ['deepseek/deepseek-v4.1-flash', 'poolside/laguna-s-2.1-free', 'inclusionai/ling-3.0-flash-sante-free'];

function extractText(data) {
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

export async function askGateway(messages, options = {}) {
  let token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    try { token = await getVercelOidcToken(); } catch {}
  }
  if (!token) {
    throw new Error('AI Gateway authentication is unavailable for this deployment.');
  }

  const configured = process.env.MCLAIN_AGENT_MODEL;
  const models = configured ? [configured] : DEFAULT_MODELS;
  let lastError = 'No AI Gateway model was available.';

  for (const model of models) {
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
      lastError = data?.error?.message || ('Gateway returned HTTP ' + response.status);
      if (configured) break;
      continue;
    }

    const text = extractText(data);
    if (!text) {
      lastError = 'The agent model returned an empty response.';
      if (configured) break;
      continue;
    }

    return { text, model: data?.model || model };
  }

  throw new Error(lastError);
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
