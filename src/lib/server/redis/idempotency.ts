
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redisClient } from './index';
import { ApiError } from '../http/errors';

const IDEMPOTENCY_HEADER = 'Idempotency-Key';

interface StoredResponse {
  body: string;
  status: number;
  headers: Record<string, string>;
}

/**
 * A wrapper for API route handlers to provide idempotency.
 * It uses the `Idempotency-Key` header to identify unique requests.
 *
 * @param req The NextRequest object.
 * @param traceId The trace ID for the request.
 * @param handler The actual API logic to be executed.
 * @param ttlSec The time-to-live for the idempotency key in seconds. Defaults to 10 minutes (600).
 * @returns A NextResponse object.
 */
export async function withIdempotency(
  req: NextRequest,
  traceId: string,
  handler: () => Promise<NextResponse>,
  ttlSec: number = 600
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get(IDEMPOTENCY_HEADER);

  if (!idempotencyKey) {
    return new ApiError(
      'IDEMPOTENCY_KEY_REQUIRED',
      `Header '${IDEMPOTENCY_HEADER}' is required.`,
      400
    ).toResponse(traceId);
  }

  // If redis is not configured, bypass idempotency check for graceful degradation.
  if (!redisClient) {
    return handler();
  }

  // Create a consistent hash of the key
  const keyHash = createHash('sha256').update(idempotencyKey).digest('hex');
  const redisKey = `idem:${keyHash}`;

  const stored = await redisClient.get(redisKey);

  if (stored) {
    const { body, status, headers } = JSON.parse(stored) as StoredResponse;
    const responseHeaders = new Headers(headers);
    responseHeaders.set('X-Idempotent', 'hit');
    return new NextResponse(body, { status, headers: responseHeaders });
  }
  
  // Lock the key to prevent race conditions from duplicate concurrent requests
  const lockKey = `${redisKey}:lock`;
  const lockAcquired = await redisClient.set(lockKey, 'locked', 'EX', 10, 'NX'); // 10s lock

  if (!lockAcquired) {
      return new ApiError(
          'request_in_progress',
          'A request with the same idempotency key is already being processed.',
          409 // Conflict
      ).toResponse(traceId);
  }

  try {
    const response = await handler();

    // Store only successful (2xx) or conflict (409) responses
    if ((response.status >= 200 && response.status < 300) || response.status === 409) {
      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const dataToStore: StoredResponse = {
        body: responseBody,
        status: response.status,
        headers: responseHeaders,
      };

      await redisClient.set(redisKey, JSON.stringify(dataToStore), 'EX', ttlSec);

      // Return a cloned response because the body has been read
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Idempotent', 'stored');
      return new NextResponse(responseBody, { status: response.status, headers: newHeaders });
    }

    return response;
  } finally {
      // Release the lock
      await redisClient.del(lockKey);
  }
}
