// Private proxy for the McLain System Second Brain. Browser code never receives Supabase credentials.
const COOKIE = 'mclain_session';
const ENDPOINT = process.env.MCLAIN_BRAIN_ENDPOINT || 'https://myfgnukugylhqvmcjceu.supabase.co/functions/v1/mclain-brain';
const MAX_BODY = 3 * 1024 * 1024 + 64 * 1024;

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
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
async function forward(request) {
  const token = readCookie(request.headers.get('cookie'), COOKIE);
  if (!/^[a-f0-9]{64}$/i.test(token)) return Response.json({ error: 'locked' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  if (request.method === 'POST' && !safeOrigin(request)) return Response.json({ error: 'origin_rejected' }, { status: 403, headers: { 'cache-control': 'no-store' } });

  const target = new URL(ENDPOINT);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers = { accept: request.headers.get('accept') || '*/*', 'x-mclain-session': token };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  let body;
  if (request.method === 'POST') {
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > MAX_BODY) return Response.json({ error: 'payload_too_large' }, { status: 413 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > MAX_BODY) return Response.json({ error: 'payload_too_large' }, { status: 413 });
    body = bytes;
  }

  let upstream;
  try { upstream = await fetch(target, { method: request.method, headers, body, cache: 'no-store', redirect: 'manual' }); }
  catch { return Response.json({ error: 'knowledge_unavailable' }, { status: 502, headers: { 'cache-control': 'no-store' } }); }

  const responseHeaders = new Headers({
    'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff'
  });
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) responseHeaders.set('content-disposition', disposition.replace(/^attachment/i, 'inline'));
  const csp = upstream.headers.get('content-security-policy');
  if (csp) responseHeaders.set('content-security-policy', csp);
  const length = upstream.headers.get('content-length');
  if (length) responseHeaders.set('content-length', length);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request) { return forward(request); }
export async function POST(request) { return forward(request); }
