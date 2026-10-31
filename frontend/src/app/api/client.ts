const configuredApiUrl = import.meta.env?.VITE_API_URL?.trim();
const productionApiUrl = 'https://gaggu-s-3.onrender.com';

/** In dev, use same-origin requests via Vite proxy so session cookies are stored correctly. */
const defaultApiUrl = import.meta.env.DEV ? '' : productionApiUrl;

export const API_BASE_URL = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');
const READ_TIMEOUT_MS = 120_000;
const READ_MAX_ATTEMPTS = 3;
const RETRYABLE_READ_STATUSES = new Set([408, 429, 502, 503, 504]);

const waitBeforeReadRetry = (attempt: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, 500 * (2 ** attempt));
});

export async function resilientFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' || method === 'HEAD' ? READ_MAX_ATTEMPTS : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const timeoutId = window.setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!RETRYABLE_READ_STATUSES.has(response.status) || attempt === maxAttempts - 1) return response;
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (init.signal?.aborted || attempt === maxAttempts - 1) throw error;
    } finally {
      window.clearTimeout(timeoutId);
      init.signal?.removeEventListener('abort', abortFromCaller);
    }
    await waitBeforeReadRetry(attempt);
  }

  throw new Error('Storefront request retry loop ended unexpectedly');
}

type UnknownRecord = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function getErrorDetails(payload: unknown, status: number): ApiError {
  const body = asRecord(payload);
  const nestedError = asRecord(body?.error);
  const code = typeof nestedError?.code === 'string'
    ? nestedError.code
    : `HTTP_${status || 500}`;
  const message = typeof nestedError?.message === 'string'
    ? nestedError.message
    : typeof body?.message === 'string'
      ? body.message
      : 'Something went wrong. Please try again.';

  return new ApiError(status, code, message, nestedError?.details);
}

let getAuthToken: (() => Promise<string | null>) | null = null;
export function setAuthTokenProvider(provider: (() => Promise<string | null>) | null) {
  getAuthToken = provider;
}

async function performRequest<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const token = await getAuthToken?.();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const hasFormDataBody = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body != null && !hasFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await resilientFetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to connect. Check your internet connection and try again.',
    );
  }

  if (response.status === 204) {
    if (!response.ok) {
      throw getErrorDetails(undefined, response.status);
    }
    return undefined as T;
  }

  const responseText = await response.text();
  let payload: unknown;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        const message = responseText.trim();
        throw new ApiError(
          response.status,
          `HTTP_${response.status || 500}`,
          message && message.length <= 300
            ? message
            : 'Something went wrong. Please try again.',
        );
      }
      throw new ApiError(
        502,
        'INVALID_RESPONSE',
        'The server returned an invalid response. Please try again.',
      );
    }
  }

  const body = asRecord(payload);
  if (!response.ok || body?.success === false) {
    throw getErrorDetails(payload, response.status);
  }

  return (body && 'data' in body ? body.data : payload) as T;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return performRequest<T>(path, init);
}
