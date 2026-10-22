import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { ApiError, API_BASE_URL, apiRequest } from './client.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('sends cookie credentials and unwraps successful API data', async () => {
  let capturedInput: string | URL | Request | undefined;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    capturedInput = input;
    capturedInit = init;
    return new Response(JSON.stringify({ success: true, data: { value: 42 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await apiRequest<{ value: number }>('/api/v1/example', {
    method: 'POST',
    body: JSON.stringify({ enabled: true }),
  });

  assert.equal(String(capturedInput), `${API_BASE_URL}/api/v1/example`);
  assert.equal(capturedInit?.credentials, 'include');
  assert.equal(new Headers(capturedInit?.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(result, { value: 42 });
});

test('turns a structured API failure into an ApiError', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: { code: 'OTP_INVALID', message: 'The verification code is invalid.' },
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    apiRequest('/api/v1/auth/otp/verify'),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.code === 'OTP_INVALID' &&
      error.message === 'The verification code is invalid.',
  );
});

test('preserves a useful message when an upstream error is plain text', async () => {
  globalThis.fetch = async () =>
    new Response('Too many login attempts. Please try again later.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain' },
    });

  await assert.rejects(
    apiRequest('/api/v1/auth/otp/request'),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 429 &&
      error.code === 'HTTP_429' &&
      error.message === 'Too many login attempts. Please try again later.',
  );
});

test('shares one session refresh across concurrent unauthorized requests', async () => {
  let refreshCalls = 0;
  const attempts = new Map<string, number>();

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/v1/auth/session/refresh')) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const attempt = (attempts.get(url) || 0) + 1;
    attempts.set(url, attempt);
    if (attempt === 1) {
      return new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, data: { url } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const [orders, profile] = await Promise.all([
    apiRequest<{ url: string }>('/api/v1/orders'),
    apiRequest<{ url: string }>('/api/v1/auth/profile'),
  ]);

  assert.equal(refreshCalls, 1);
  assert.equal(orders.url, `${API_BASE_URL}/api/v1/orders`);
  assert.equal(profile.url, `${API_BASE_URL}/api/v1/auth/profile`);
});
