// The ChatGPT second opinion, self-hosted: sends the same prompt to OpenAI.
// Optional. Needs OPENAI_API_KEY (and optionally OPENAI_MODEL) in the Vercel
// project settings. The middleware keeps this route behind the site password.
const MAX_PROMPT_CHARS = 30000;

export async function POST(request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: 'missing_key', message: 'Add OPENAI_API_KEY to this site’s Vercel settings to turn ChatGPT on.' }, { status: 503 });
  }

  let prompt = '';
  try {
    const body = await request.json();
    prompt = typeof body?.prompt === 'string' ? body.prompt : '';
  } catch {
    prompt = '';
  }
  if (!prompt.trim()) return Response.json({ error: 'bad_request', message: 'The question was empty.' }, { status: 400 });
  if (prompt.length > MAX_PROMPT_CHARS) return Response.json({ error: 'too_long', message: 'That question is too long. Shorten it.' }, { status: 413 });

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 1500,
      }),
    });
  } catch {
    return Response.json({ error: 'upstream', message: 'ChatGPT didn’t answer. Ask again.' }, { status: 502 });
  }

  let data = null;
  try {
    data = await upstream.json();
  } catch {
    data = null;
  }
  if (!upstream.ok) {
    const detail = data?.error?.message ? `: ${data.error.message}` : '';
    const status = upstream.status === 429 ? 429 : 502;
    return Response.json({ error: 'upstream', message: `ChatGPT returned an error (${upstream.status})${detail}` }, { status });
  }
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return Response.json({ error: 'empty', message: 'ChatGPT sent back an empty answer.' }, { status: 502 });
  return Response.json({ text, model: data.model });
}
