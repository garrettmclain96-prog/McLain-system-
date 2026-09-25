const COOKIE = 'mclain_session';

export function POST(request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403 });
    } catch {
      return new Response(null, { status: 403 });
    }
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/login.html',
      'cache-control': 'no-store',
      'Set-Cookie': COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
}
