// Public verification oracle for the private state service.
// It validates a 256-bit session token without ever exposing SITE_PASSWORD.
import { createHmac, timingSafeEqual } from 'node:crypto';

const LABEL = 'mclain-system-session-v1';

function expectedToken(password) {
  return createHmac('sha256', password).update(LABEL).digest('hex');
}

function same(a, b) {
  try {
    const aa = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    return aa.length === bb.length && timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

export async function POST(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return Response.json({ valid: false }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }

  let token = '';
  try {
    const raw = await request.text();
    if (raw.length > 256) {
      return Response.json({ valid: false }, { status: 413, headers: { 'cache-control': 'no-store' } });
    }
    token = String(JSON.parse(raw || '{}')?.token || '');
  } catch {}

  const valid = /^[a-f0-9]{64}$/i.test(token) && same(token, expectedToken(password));
  return Response.json(
    { valid },
    { status: valid ? 200 : 401, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } },
  );
}
