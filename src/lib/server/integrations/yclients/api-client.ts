
import { getEnv } from '@/lib/server/config.server';
import { ApiError } from '@/lib/server/http/errors';

/**
 * A basic HTTP client for the YCLIENTS API.
 */
export class YclientsApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = getEnv('UCLIENTS_API_URL') ?? '';
    this.apiKey = getEnv('UCLIENTS_API_KEY') ?? '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('YCLIENTS API URL or Key is not configured.');
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    payload?: unknown,
    traceId?: string,
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/vnd.yclients.v2+json',
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId || crypto.randomUUID(),
    };

    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: payload ? JSON.stringify(payload) : undefined,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new ApiError(
            `yclients_error_${response.status}`,
            `YCLIENTS API error: ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        // Handle cases where YCLIENTS returns 200 OK but with an error in the body
        const responseData = await response.json();
        if (responseData.success === false) {
           throw new ApiError(
            `yclients_logic_error`,
            `YCLIENTS logic error: ${responseData.error_msg}`,
            400,
            responseData
          );
        }

        return responseData as T;
      } catch (error) {
        lastError = error;
        // Retry on network errors or 5xx server errors
        if (error instanceof TypeError || (error instanceof ApiError && error.statusCode >= 500)) {
           if (i < retries - 1) {
            await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
            continue;
           }
        }
        throw error;
      }
    }
    throw lastError;
  }

  public get<T>(endpoint: string, traceId?: string): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, traceId);
  }

  public post<T>(endpoint: string, payload: unknown, traceId?: string): Promise<T> {
    return this.request<T>('POST', endpoint, payload, traceId);
  }
}
