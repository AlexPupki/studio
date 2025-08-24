
'use server';

import { cookies } from 'next/headers';
import { createSessionService } from './auth.service.server';
import { getEnv } from '../config.server';

const sessionService = createSessionService();

/**
 * Lightweight session validation for middleware.
 * Reads the session cookie and verifies it with the session store (e.g., Redis).
 * Does NOT query the main database or import 'pg' related code.
 */
export async function validateSession() {
  const cookieName = getEnv('COOKIE_NAME');
  const cookieValue = cookies().get(cookieName)?.value;
  if (!cookieValue) return null;

  const session = await sessionService.read(cookieValue);
  if (!session?.userId) return null;

  return { userId: session.userId };
}
