import { resolveAdminApiBaseUrl } from './apiBaseUrl.mjs';

// Production must stay same-origin so Safari and other privacy-focused browsers
// treat the HttpOnly admin session as a first-party cookie. Vercel proxies /api.
const API_BASE_URL = resolveAdminApiBaseUrl({
  dev: import.meta.env.DEV,
  configuredUrl: import.meta.env.VITE_API_URL,
});
const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_ATTEMPT_TIMEOUT_MS = 60_000;
const RETRYABLE_LOGIN_STATUSES = new Set([502, 503, 504]);
const RETRYABLE_REQUEST_STATUSES = new Set([429, 502, 503, 504]);
const REQUEST_MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const inFlightGetRequests = new Map<string, Promise<unknown>>();
let refreshPromise: Promise<boolean> | null = null;

const waitBeforeRetry = (attempt: number, serverDelayMs = 0) => new Promise<void>((resolve) => {
  const exponentialDelay = 500 * (2 ** attempt) + Math.floor(Math.random() * 250);
  window.setTimeout(resolve, Math.min(Math.max(serverDelayMs, exponentialDelay), 5_000));
});

function getRetryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 0;
}

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export function getAdminLoginErrorMessage(error: unknown): string {
  if (!(error instanceof AdminApiError)) {
    return 'Something went wrong while signing in. Please try again.';
  }
  if (error.status === 0) {
    return 'The sign-in service is taking longer than expected. Your credentials were not rejected; please try again.';
  }
  if (error.status === 401) {
    return 'We could not sign you in. Please verify your admin access or try again.';
  }
  if (error.status === 429) {
    return 'Too many sign-in attempts. Please wait a few minutes and try again.';
  }
  if (error.status >= 500) {
    return 'The sign-in service is temporarily unavailable. Please try again shortly.';
  }
  return error.message || 'Sign-in failed. Please try again.';
}

async function fetchWithLoginResilience(
  path: string,
  init: RequestInit,
  headers: Headers,
): Promise<Response> {
  const isLogin = path === '/api/v1/admin/auth/login';
  const isRetryableRead = (init.method || 'GET').toUpperCase() === 'GET';
  const isIdempotentWrite = headers.has('Idempotency-Key');
  const isRetryableRequest = isLogin || isRetryableRead || isIdempotentWrite;
  const maxAttempts = isLogin ? LOGIN_MAX_ATTEMPTS : (isRetryableRequest ? REQUEST_MAX_ATTEMPTS : 1);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let retryAfterMs = 0;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
          () => controller.abort(),
          isLogin ? LOGIN_ATTEMPT_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
        );
    const abortFromCaller = () => controller?.abort();
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
      const retryableStatuses = isLogin ? RETRYABLE_LOGIN_STATUSES : RETRYABLE_REQUEST_STATUSES;
      const shouldRetry = isRetryableRequest
        && retryableStatuses.has(response.status)
        && attempt < maxAttempts - 1;
      if (!shouldRetry) return response;
      retryAfterMs = getRetryAfterMs(response);
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (!isRetryableRequest || attempt >= maxAttempts - 1 || init.signal?.aborted) throw error;
    } finally {
      window.clearTimeout(timeoutId);
      init.signal?.removeEventListener('abort', abortFromCaller);
    }
    if (retryAfterMs > 0) await waitBeforeRetry(attempt, retryAfterMs);
    else await waitBeforeRetry(attempt);
  }

  throw new Error('Admin login retry loop ended unexpectedly');
}

function refreshAdminSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetchWithLoginResilience(
      '/api/v1/admin/auth/refresh',
      { method: 'POST' },
      new Headers({ Accept: 'application/json' }),
    )
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetchWithLoginResilience(path, init, headers);
  if (response.status === 401
    && path !== '/api/v1/admin/auth/login'
    && path !== '/api/v1/admin/auth/refresh'
    && await refreshAdminSession()) {
    return fetchWithLoginResilience(path, init, headers);
  }
  return response;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response: Response;
  try {
    response = await adminFetch(path, { ...init, headers });
  } catch {
    throw new AdminApiError(0, 'Unable to reach the server');
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new AdminApiError(response.status, payload.error?.message || payload.message || 'Admin request failed');
  }
  return (payload.data ?? payload) as T;
}

export function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  if (method !== 'GET' || init.signal) return request<T>(path, init);

  const existing = inFlightGetRequests.get(path) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = request<T>(path, init)
    .finally(() => inFlightGetRequests.delete(path));
  inFlightGetRequests.set(path, pending);
  return pending;
}

export { API_BASE_URL };
