'use server';

import { NextRequest } from 'next/server';
import { getEnv } from '../config';
import { ApiError } from './errors';

/**
 * Asserts that the request's origin is trusted.
 * It checks the `Origin` or `Referer` header against the `NEXT_PUBLIC_APP_URL`.
 * This is a crucial CSRF protection measure for API routes.
 *
 * @param req The NextRequest object.
 * @throws {ApiError} if the origin is missing or not trusted.
 */
export function assertTrustedOrigin(req: NextRequest): void {
  // Allow all in development for simplicity (e.g., from ngrok, etc.)
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const appUrl = getEnv('NEXT_PUBLIC_APP_URL');
  if (!appUrl) {
    throw new ApiError('configuration_error', 'APP_URL is not configured.', 500);
  }

  const trustedOrigin = new URL(appUrl).origin;
  const requestOrigin = req.headers.get('Origin');
  const referer = req.headers.get('Referer');

  let actualOrigin: string | null = null;
  if (requestOrigin) {
    actualOrigin = requestOrigin;
  } else if (referer) {
    actualOrigin = new URL(referer).origin;
  }

  if (!actualOrigin) {
    throw new ApiError('missing_origin', 'Missing Origin or Referer header.', 403);
  }

  if (actualOrigin !== trustedOrigin) {
    throw new ApiError(
      'untrusted_origin',
      `The origin '${actualOrigin}' is not trusted.`,
      403
    );
  }
}
