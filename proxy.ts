import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In Next 16 the old `middleware.ts` is renamed to `proxy.ts`. This runs on the
// server before the request hits the page/route. We use it as a bouncer for the
// admin area: HTTP Basic Auth backed by one env var, ADMIN_PASSWORD.
//
// HTTP Basic Auth = the browser's built-in login box. When we answer with
// 401 + `WWW-Authenticate: Basic`, the browser pops a username/password prompt,
// then re-sends every request to this path with an `Authorization: Basic <...>`
// header (base64 of "user:pass"). It remembers the creds for the session, so
// the admin's fetch() calls to /api/admin carry them automatically too.

export const config = {
  // Guard the panel and its API. Nothing else is affected.
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};

export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  // If no password is configured, lock the door completely rather than leaving
  // it wide open — a missing secret should fail closed.
  if (!password) {
    return new NextResponse('Admin panel disabled: set ADMIN_PASSWORD.', { status: 503 });
  }

  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    const decoded = atob(header.slice(6)); // "user:pass"
    const pass = decoded.slice(decoded.indexOf(':') + 1);
    if (pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ClashCanvas Admin", charset="UTF-8"' },
  });
}
