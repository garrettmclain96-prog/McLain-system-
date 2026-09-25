// Signs a device in: checks the password from the login form and sets the
// session cookie the middleware expects. Wrong passwords wait before answering
// to slow down guessing.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const DAY = 24 * 60 * 60;

function digest(value) {
  return createHash('sha256').update(value).digest();
}

export async function POST(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return new Response('SITE_PASSWORD is not set.', { status: 503 });

  let given = '';
  try {
    const form = await request.formData();
    given = String(form.get('password') || '');
  } catch {
    given = '';
  }

  if (!timingSafeEqual(digest(given), digest(password))) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return new Response(null, { status: 303, headers: { Location: '/login.html?e=1', 'cache-control': 'no-store' } });
  }

  const token = createHmac('sha256', password).update('mclain-system-session-v1').digest('hex');
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'cache-control': 'no-store',
      'Set-Cookie': `mclain_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Priority=High; Max-Age=${90 * DAY}`,
    },
  });
}
