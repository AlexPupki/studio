
import { NextResponse, type NextRequest } from 'next/server';
import { getFeature, getEnv } from '@/lib/server/config.server';
import { jwtVerify } from 'jose';

async function verifyAuth(token: string | undefined) {
    if (!token) {
        return { error: 'missing token' };
    }
    try {
        const secret = getEnv('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
        return { payload };
    } catch (err) {
        return { error: 'invalid token' };
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // --- Session validation ---
  const cookieName = getEnv('COOKIE_NAME');
  const token = request.cookies.get(cookieName)?.value;
  const { payload, error } = await verifyAuth(token);
  const isAuthenticated = !error;

  // --- OPS Routes Protection ---
  if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(
        new URL('/login?next=' + request.nextUrl.pathname, request.url)
      );
    }
    const canAccessOps = payload?.roles?.some(role => role.startsWith('ops.'));
     if (!canAccessOps) {
        return NextResponse.redirect(new URL('/account?error=forbidden', request.url));
    }
    return NextResponse.next();
  }

  // --- Customer Routes Protection ---
  const isAccountFeatureEnabled = getFeature('FEATURE_ACCOUNT');

  if (!isAccountFeatureEnabled && pathname.startsWith('/account')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAccountFeatureEnabled) {
    if (pathname.startsWith('/account') && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if ((pathname.startsWith('/login') || pathname.startsWith('/verify')) && isAuthenticated) {
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
