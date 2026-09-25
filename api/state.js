// Authenticated proxy between the web app and the private Supabase state function.
// Browser code never receives a database secret or privileged key.
const COOKIE = 'mclain_session';
const ENDPOINT = process.env.MCLAIN_STATE_ENDPOINT || 'https://myfgnukugylhqvmcjceu.supabase.co/functions/v1/mclain-system-state';
const ALLOWED_ACTIONS = new Set(['weights', 'venture_patch', 'brief', 'replace_state', 'event']);

function readCookie(header, name) {
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function safeOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function forward(request, body) {
  const token = readCookie(request.headers.get('cookie'), COOKIE);
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return Response.json({ error: 'locked' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }

  let upstream;
  try {
    upstream = await fetch(ENDPOINT, {
      method: body == null ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-mclain-session': token,
      },
      body: body == null ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return Response.json({ error: 'state_unavailable' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function GET(request) {
  return forward(request, null);
}

export async function POST(request) {
  if (!safeOrigin(request)) {
    return Response.json({ error: 'origin_rejected' }, { status: 403, headers: { 'cache-control': 'no-store' } });
  }

  let raw = '';
  try { raw = await request.text(); } catch {}
  if (raw.length > 300000) {
    return Response.json({ error: 'payload_too_large' }, { status: 413, headers: { 'cache-control': 'no-store' } });
  }

  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  if (!ALLOWED_ACTIONS.has(String(body?.action || ''))) {
    return Response.json({ error: 'unknown_action' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  body.actor = 'mclain-system-web';
  return forward(request, body);
}
