import { NextResponse, type NextRequest } from 'next/server';
import { getFeature, getEnv } from '@/lib/server/config';
import { getCurrentUser } from '@/lib/server/auth/auth.actions';

// This is a placeholder for Firebase Admin SDK initialization
// In a real app, this would be initialized once.
// import admin from 'firebase-admin';
// if (!admin.apps.length) {
//   admin.initializeApp();
// }


async function verifyFirebaseToken(request: NextRequest): Promise<{ uid: string, claims: any } | null> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7);
    try {
        // const decodedToken = await admin.auth().verifyIdToken(token);
        // return { uid: decodedToken.uid, claims: decodedToken };
        
        // --- STUB IMPLEMENTATION FOR DEMO ---
        // In a real implementation, you would use the commented out code above.
        // This stub allows testing without a live Firebase project.
        if (token === "test-ops-editor-token") {
            return { uid: 'ops-editor-uid', claims: { roles: ['ops.editor'] } };
        }
         if (token === "test-ops-viewer-token") {
            return { uid: 'ops-viewer-uid', claims: { roles: ['ops.viewer'] } };
        }
        return null;
        // --- END STUB ---

    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return null;
    }
}


export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // --- OPS Routes Protection ---
    if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
        const decodedToken = await verifyFirebaseToken(request);
        
        if (!decodedToken) {
            const response = { error: 'Unauthorized', code: 'UNAUTHORIZED' };
             if (pathname.startsWith('/api/ops')) {
                return NextResponse.json(response, { status: 401 });
            }
            return NextResponse.redirect(new URL('/login?error=ops_auth_failed', request.url));
        }

        const userRoles = decodedToken.claims.roles || [];

        const isEditor = userRoles.includes('ops.editor');
        const isViewer = userRoles.includes('ops.viewer') || isEditor; // An editor is also a viewer

        // Viewer access for GET requests
        if (request.method === 'GET' && !isViewer) {
            return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_VIEW' }, { status: 403 });
        }

        // Editor access for non-GET requests
        if (request.method !== 'GET' && !isEditor) {
             return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_EDIT' }, { status: 403 });
        }
        
        // Allow access if roles are sufficient
        return NextResponse.next();
    }


    // --- Customer Routes Protection (/account, /login, /verify) ---
    const isAccountFeatureEnabled = getFeature('FEATURE_ACCOUNT');
    const cookieName = getEnv('COOKIE_NAME');
    const sessionCookie = request.cookies.get(cookieName);

    if (!isAccountFeatureEnabled && pathname.startsWith('/account')) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    
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
  matcher: ['/account/:path*', '/login', '/verify', '/ops/:path*', '/api/ops/:path*'],
};
