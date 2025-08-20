'use server';

import { NextResponse } from 'next/server';

/**
 * A standard format for API errors.
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: any;
  traceId: string;
  retryAfter?: number;
}

/**
 * Custom error class for API-specific errors.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly retryAfter?: number;

  constructor(code: string, message: string, statusCode: number, details?: any, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfter = retryAfter;
  }

  toResponse(traceId: string): NextResponse<ApiErrorResponse> {
    const body: ApiErrorResponse = {
      error: this.message,
      code: this.code,
      details: this.details,
      traceId,
    };
    if (this.retryAfter) {
        body.retryAfter = this.retryAfter;
    }
    const headers: Record<string, string> = {};
    if (this.retryAfter) {
        headers['Retry-After'] = this.retryAfter.toString();
    }
    return NextResponse.json(body, { status: this.statusCode, headers });
  }
}

/**
 * Wraps an API handler to provide centralized error handling and tracing.
 * @param handler The API route handler to wrap.
 * @returns A new handler with error handling.
 */
export function withApiError(
  handler: (req: Request, traceId: string) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // Generate a unique trace ID for each request.
    const traceId = crypto.randomUUID();
    const { method, url } = req;
    const urlPath = new URL(url).pathname;

    console.log(`[${traceId}] ==> ${method} ${urlPath}`);

    try {
      const response = await handler(req, traceId);
      console.log(`[${traceId}] <== ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      let apiError: ApiError;

      if (error instanceof ApiError) {
        apiError = error;
      } else if (error instanceof Error) {
        // Generic internal server error
        apiError = new ApiError('internal_server_error', 'An unexpected error occurred.', 500, {
          originalError: error.message,
        });
      } else {
        // Handle non-Error objects being thrown
        apiError = new ApiError('unknown_error', 'An unknown error occurred.', 500);
      }

      console.error(`[${traceId}] <== ${apiError.statusCode} ERROR: ${apiError.message}`, apiError.details || '');
      
      return apiError.toResponse(traceId);
    }
  };
}