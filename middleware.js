// Password gate for the self-hosted McLain System (Vercel Routing Middleware).
// Every page and API route needs a valid session cookie, except the login page,
// the login endpoint and the files a phone needs to add the app to its home
// screen. It fails closed: with no SITE_PASSWORD set, nothing is served.
import { next } from '@vercel/functions';

const COOKIE = 'mclain_session';
const PUBLIC_PATHS = new Set([
  '/login.html',
  '/api/login',
  '/manifest.webmanifest',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/favicon.ico',
]);

export const config = {
  matcher: '/:path*',
};

// The session token is an HMAC of a fixed label keyed by the site password,
// so changing SITE_PASSWORD in Vercel signs every device out.
async function sessionToken(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('mclain-system-session-v1'));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(header, name) {
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return new Response('This site is locked until SITE_PASSWORD is set in its Vercel project settings.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname)) return next();

  const cookie = readCookie(request.headers.get('cookie'), COOKIE);
  if (cookie && sameString(cookie, await sessionToken(password))) return next();

  if (url.pathname.startsWith('/api/')) {
    return Response.json({ error: 'locked', message: 'Sign in first.' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  return Response.redirect(new URL('/login.html', request.url), 302);
}
