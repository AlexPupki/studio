// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSessionService } from '@/lib/iam/session.service.server';

const protectedRoutes = ['/account'];
const authRoutes = ['/login', '/verify'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieName = process.env.COOKIE_NAME || 'gts.sid';
  const sealedSession = request.cookies.get(cookieName)?.value;
  const secretKey = process.env.SESSION_SECRET_KEY;

  if (!secretKey) {
    console.error('SESSION_SECRET_KEY is not set. Middleware cannot run.');
    // В случае отсутствия ключа, лучше прервать обработку, 
    // чтобы избежать небезопасного состояния.
    return NextResponse.next();
  }

  const sessionService = await createSessionService({ secretKey, cookieName });
  const session = sealedSession ? await sessionService.getActiveSession(sealedSession) : null;
  const isAuth = !!session;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Если пользователь не авторизован и пытается зайти на защищенную страницу,
  // перенаправляем его на страницу входа.
  if (isProtectedRoute && !isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Сохраняем исходный URL для редиректа после входа
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Если пользователь авторизован и пытается зайти на страницу входа/верификации,
  // перенаправляем его в личный кабинет.
  if (isAuthRoute && isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/account';
    return NextResponse.redirect(url);
  }

  // В остальных случаях продолжаем как обычно.
  return NextResponse.next();
}

// Указываем, к каким путям применять middleware.
export const config = {
  // Применяем middleware к страницам входа, верификации и всем страницам аккаунта.
  // Это более надежный подход, чем исключение системных путей.
  matcher: ['/login', '/verify', '/account/:path*'],
};
