// Ask the System, self-hosted: sends the page's prompt (every venture, score,
// weight and the question) to Claude and returns the answer text.
// Needs ANTHROPIC_API_KEY in the Vercel project settings. The middleware keeps
// this route behind the site password.
import Anthropic from '@anthropic-ai/sdk';

const MAX_PROMPT_CHARS = 30000;

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_key', message: 'Add ANTHROPIC_API_KEY to this site’s Vercel settings to turn Claude on.' }, { status: 503 });
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

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      // Server-side fallbacks: if a safety classifier declines, the API retries on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'refused', message: 'Claude declined that question. Try asking it another way.' }, { status: 422 });
    }
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n')
      .trim();
    if (!text) return Response.json({ error: 'empty', message: 'No answer came back. Try a simpler question.' }, { status: 502 });
    return Response.json({ text, model: response.model, truncated: response.stop_reason === 'max_tokens' });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'bad_key', message: 'The Anthropic key in Vercel was rejected. Check ANTHROPIC_API_KEY.' }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', message: 'Too many questions right now. Wait a minute, then ask again.' }, { status: 429 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return Response.json({ error: 'bad_request', message: 'Claude couldn’t take that request: ' + error.message }, { status: 400 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: 'upstream', message: `Claude had a problem (${error.status ?? 'network'}). Ask again.` }, { status: 502 });
    }
    return Response.json({ error: 'server', message: 'Something went wrong on the server. Ask again.' }, { status: 500 });
  }
}
