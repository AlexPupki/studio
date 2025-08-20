import { NextResponse, type NextRequest } from 'next/server';
import { getFeature, getEnv } from '@/lib/server/config';
import { getCurrentUser } from '@/lib/server/auth/auth.actions';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Check if the account feature is enabled
    const isAccountFeatureEnabled = getFeature('FEATURE_ACCOUNT');

    const cookieName = getEnv('COOKIE_NAME');
    const sessionCookie = request.cookies.get(cookieName);

    // If account feature is disabled, redirect away from account page
    if (!isAccountFeatureEnabled && pathname.startsWith('/account')) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    
    // If account feature is enabled, protect the account page
    if (isAccountFeatureEnabled) {
        if (pathname.startsWith('/account') && !sessionCookie) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(loginUrl);
        }

        if ((pathname.startsWith('/login') || pathname.startsWith('/verify')) && sessionCookie) {
            const nextUrl = request.nextUrl.searchParams.get('next');
            return NextResponse.redirect(new URL(nextUrl || '/account', request.url));
        }
    }
    
    if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
        const user = await getCurrentUser();
        if (!user || !user.roles.includes('ops')) {
            if (pathname.startsWith('/api/ops')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/login', '/verify', '/ops/:path*', '/api/ops/:path*'],
};
