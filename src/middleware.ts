
import { NextResponse, type NextRequest } from 'next/server';
import { getFeature } from '@/lib/server/config.server';
import { jwtVerify } from 'jose';
import type { UserRole } from '@/lib/shared/iam.contracts';

async function verifyAuth(token: string | undefined) {
    if (!token) {
        return { error: 'missing token' };
    }
    try {
        const secret = process.env.JWT_SECRET;
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
  
  // Use direct access to process.env in middleware as getEnv might not be initialized
  const cookieName = process.env.COOKIE_NAME || 'gts_session';
  const token = request.cookies.get(cookieName)?.value;
  const { payload, error } = await verifyAuth(token);
  const isAuthenticated = !error;
  const roles = (payload?.roles as UserRole[]) || [];
  
  // Add a header with the current path to be used in layouts
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-pathname', request.nextUrl.pathname);


  // --- OPS Routes Protection ---
  if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
    // Allow access to the login page itself
    if (pathname.startsWith('/ops/login')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (!isAuthenticated) {
      return NextResponse.redirect(
        new URL('/ops/login?next=' + request.nextUrl.pathname, request.url)
      );
    }
    const canAccessOps = roles.some(role => role.startsWith('ops.') || role === 'admin');
     if (!canAccessOps) {
        return NextResponse.redirect(new URL('/account?error=forbidden', request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- Customer Routes Protection ---
  // Using process.env directly for feature flags in middleware
  const isAccountFeatureEnabled = (process.env.FEATURE_ACCOUNT || 'true') === 'true';

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
       // If user is authenticated and tries to access login, redirect them away
      const nextUrl = request.nextUrl.searchParams.get('next');

      // Special case: if an ops user lands on customer login, redirect to ops dashboard
      const isOpsUser = roles.some(role => role.startsWith('ops.') || role === 'admin');
      if (isOpsUser) {
        return NextResponse.redirect(new URL('/ops/dashboard', request.url));
      }

      // Avoid redirecting to ops pages from customer login
      if (nextUrl && !nextUrl.startsWith('/ops')) {
         return NextResponse.redirect(new URL(nextUrl, request.url));
      }
      return NextResponse.redirect(new URL('/account', request.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
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
