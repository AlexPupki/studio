'use server';

import { NextResponse } from 'next/server';
import { db } from '../db';
import { requestLogs } from '../db/schema';
import { getIp } from '../http/ip';
import { audit } from '../audit';

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
    const startTime = Date.now();
    const traceId = req.headers.get('X-Trace-Id') || crypto.randomUUID();
    const { method, url } = req;
    const urlPath = new URL(url).pathname;
    const ip = getIp();
    let response: Response;
    let errorCode: string | undefined;

    try {
      response = await handler(req, traceId);
      console.log(`[${traceId}] <== ${method} ${urlPath} ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      let apiError: ApiError;
      if (error instanceof ApiError) {
        apiError = error;
      } else if (error instanceof Error) {
        apiError = new ApiError('internal_server_error', 'An unexpected error occurred.', 500, {
          originalError: error.message,
        });
      } else {
        apiError = new ApiError('unknown_error', 'An unknown error occurred.', 500);
      }
      
      errorCode = apiError.code;
      console.error(`[${traceId}] <== ${method} ${urlPath} ${apiError.statusCode} ERROR: ${apiError.message}`, apiError.details || '');
      
      // Audit critical errors
      if (apiError.statusCode >= 500) {
        audit({
            traceId,
            actor: { type: 'system', id: 'api_error_wrapper' },
            action: 'error.api.unhandled',
            entity: { type: 'system', id: urlPath },
            data: { 
                method, 
                status: apiError.statusCode, 
                code: apiError.code, 
                message: apiError.message 
            }
        }).catch(console.error);
      }
      
      response = apiError.toResponse(traceId);
      return response;
    } finally {
        const durationMs = Date.now() - startTime;
        // Fire-and-forget the log writing
        db.insert(requestLogs).values({
            traceId,
            method,
            path: urlPath,
            ip,
            status: response!.status,
            durationMs,
            errorCode,
            // TODO: Add userId and role once auth is integrated
        }).catch(err => {
            console.error(`[${traceId}] Failed to write request log:`, err);
        });
    }
  };
}
