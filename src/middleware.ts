
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { UserRole } from '@/lib/shared/iam.contracts';

async function verifyAuth(token: string | undefined) {
    if (!token) {
        return { error: 'missing token', payload: null };
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
        return { payload, error: null };
    } catch (err) {
        return { error: 'invalid token', payload: null };
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const cookieName = process.env.COOKIE_NAME || 'gts_session';
  const token = request.cookies.get(cookieName)?.value;
  const { payload, error } = await verifyAuth(token);
  const isAuthenticated = !error;
  const roles = (payload?.roles as UserRole[]) || [];
  const isOpsUser = isAuthenticated && roles.some(role => role.startsWith('ops.') || role === 'admin');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-pathname', request.nextUrl.pathname);

  // --- OPS Routes Protection ---
  if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
    if (pathname.startsWith('/ops/login')) {
       // If an already authenticated ops user tries to access the login page, redirect them to the dashboard.
       if (isOpsUser) {
         return NextResponse.redirect(new URL('/ops/dashboard', request.url));
       }
       return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (!isOpsUser) {
      const loginUrl = new URL('/ops/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- Customer Routes Protection ---
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

    if (pathname.startsWith('/login') || pathname.startsWith('/verify')) {
      if (isAuthenticated) {
        // If an authenticated user lands on the customer login, redirect them.
        const nextUrl = request.nextUrl.searchParams.get('next');
        // If they are an ops user, send them to the ops dashboard.
        if (isOpsUser) {
            return NextResponse.redirect(new URL('/ops/dashboard', request.url));
        }
        // Otherwise, send them to their account page.
        return NextResponse.redirect(new URL(nextUrl || '/account', request.url));
      }
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/account/:path*',
    '/login/:path*',
    '/verify/:path*',
    '/ops/:path*',
    '/api/ops/:path*',
  ],
};
