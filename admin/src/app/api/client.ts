const DEFAULT_API_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : '';

const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_ATTEMPT_TIMEOUT_MS = 60_000;
const RETRYABLE_LOGIN_STATUSES = new Set([502, 503, 504]);

const waitBeforeRetry = (attempt: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, 500 * (2 ** attempt));
});

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
  const maxAttempts = isLogin ? LOGIN_MAX_ATTEMPTS : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = isLogin ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), LOGIN_ATTEMPT_TIMEOUT_MS)
      : null;
    const abortFromCaller = () => controller?.abort();
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: 'include',
        signal: controller?.signal || init.signal,
      });
      const shouldRetry = isLogin
        && RETRYABLE_LOGIN_STATUSES.has(response.status)
        && attempt < maxAttempts - 1;
      if (!shouldRetry) return response;
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (!isLogin || attempt >= maxAttempts - 1 || init.signal?.aborted) throw error;
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      init.signal?.removeEventListener('abort', abortFromCaller);
    }

    await waitBeforeRetry(attempt);
  }

  throw new Error('Admin login retry loop ended unexpectedly');
}

async function request<T>(path: string, init: RequestInit, canRefresh: boolean): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response: Response;
  try {
    response = await fetchWithLoginResilience(path, init, headers);
  } catch {
    throw new AdminApiError(0, 'Unable to reach the server');
  }
  if (response.status === 401 && canRefresh
    && path !== '/api/v1/admin/auth/login'
    && path !== '/api/v1/admin/auth/refresh') {
    const refreshed = await fetch(`${API_BASE_URL}/api/v1/admin/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: { Accept: 'application/json' },
    });
    if (refreshed.ok) return request(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new AdminApiError(response.status, payload.error?.message || payload.message || 'Admin request failed');
  }
  return (payload.data ?? payload) as T;
}

export function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, true);
}

export { API_BASE_URL };
