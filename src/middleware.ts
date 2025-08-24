
import { NextResponse, type NextRequest } from 'next/server';
import { getFeature } from '@/lib/server/config.server';
import { validateSession } from '@/lib/server/auth/session.actions';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Session validation ---
  const session = await validateSession();

  // --- OPS Routes Protection ---
  if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
    // The ops routes are protected by default, so we need a valid session.
    if (!session) {
      return NextResponse.redirect(
        new URL('/login?next=' + request.nextUrl.pathname, request.url)
      );
    }
    // Detailed role checks will happen on the page/api route level,
    // as middleware should stay lightweight.
    return NextResponse.next();
  }

  // --- Customer Routes Protection ---
  const isAccountFeatureEnabled = getFeature('FEATURE_ACCOUNT');

  if (!isAccountFeatureEnabled && pathname.startsWith('/account')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAccountFeatureEnabled) {
    if (pathname.startsWith('/account') && !session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (
      (pathname.startsWith('/login') || pathname.startsWith('/verify')) &&
      session
    ) {
      const nextUrl = request.nextUrl.searchParams.get('next');
      return NextResponse.redirect(new URL(nextUrl || '/account', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/account/:path*',
    '/login',
    '/verify',
    '/ops/:path*',
    '/api/ops/:path*',
  ],
};
