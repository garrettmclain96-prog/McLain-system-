import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!\\.well-known/workflow|_next/static|_next/image|favicon.ico).*)'],
};
