import { NextResponse, type NextRequest } from 'next/server';
import { getFeature, getEnv } from '@/lib/server/config.server';
import { getCurrentUser } from './lib/server/auth/auth.actions';


async function handleOpsRoutes(request: NextRequest) {
    const user = await getCurrentUser(); // This now reads the session cookie and gets user data

    if (!user) {
        return NextResponse.redirect(new URL('/login?next=' + request.nextUrl.pathname, request.url));
    }
    
    const userRoles = user.roles || [];

    const isEditor = userRoles.includes('ops.editor');
    const isViewer = userRoles.includes('ops.viewer') || isEditor;

    if (!isViewer) {
         return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_ACCESS' }, { status: 403 });
    }

    // For API requests, additionally check method access
    if (request.nextUrl.pathname.startsWith('/api/ops')) {
        // Viewer access for GET requests
        if (request.method === 'GET' && !isViewer) {
            return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_VIEW' }, { status: 403 });
        }

        // Editor access for non-GET requests
        if (request.method !== 'GET' && !isEditor) {
             return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_EDIT' }, { status: 403 });
        }
    }
    
    return NextResponse.next();
}


export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // --- OPS Routes Protection ---
    if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
        return handleOpsRoutes(request);
    }
    
    // --- Customer Routes Protection ---
    const isAccountFeatureEnabled = getFeature('FEATURE_ACCOUNT');

    if (!isAccountFeatureEnabled && pathname.startsWith('/account')) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    
    if (isAccountFeatureEnabled) {
        // We can't use `getCurrentUser` here directly because it's async and middleware needs to be fast.
        // The check for the cookie is a good-enough signal here.
        const cookieName = getEnv('COOKIE_NAME');
        const sessionCookie = request.cookies.get(cookieName);

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
  matcher: ['/account/:path*', '/login', '/verify', '/ops/:path*', '/api/ops/:path*'],
};
