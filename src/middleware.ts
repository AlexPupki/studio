import { NextResponse, type NextRequest } from 'next/server';
import { getFeature } from '@/lib/server/config';
import { getEnv } from '@/lib/server/config';


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

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/login', '/verify'],
};
