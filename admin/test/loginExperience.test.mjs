import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync(
  new URL('../src/app/pages/admin/Login.tsx', import.meta.url),
  'utf8',
);

const styles = readFileSync(
  new URL('../src/styles/index.css', import.meta.url),
  'utf8',
);

const apiClientSource = readFileSync(
  new URL('../src/app/api/client.ts', import.meta.url),
  'utf8',
);

test('admin login presents an accessible, focused sign-in experience', () => {
  assert.match(loginSource, /<main className="admin-login"/);
  assert.match(loginSource, /<label htmlFor="email">Email address<\/label>/);
  assert.match(loginSource, /<label htmlFor="password">Password<\/label>/);
  assert.match(loginSource, /autoComplete="email"/);
  assert.match(loginSource, /autoComplete="current-password"/);
  assert.match(loginSource, /aria-label=\{showPassword \? 'Hide password' : 'Show password'\}/);
});

test('admin login uses a green primary action and responsive brand panel', () => {
  assert.match(loginSource, /className="admin-login-submit"/);
  assert.match(loginSource, /className="admin-login-story"/);
  assert.match(styles, /\.admin-login \.admin-login-submit[^}]*background:\s*#168451/);
  assert.match(styles, /@media \(min-width: 900px\)[\s\S]*\.admin-login-story[^}]*display:\s*flex/);
  assert.doesNotMatch(loginSource, /from-purple-600/);
});

test('admin login reports credential, rate-limit, server, and connection failures accurately', () => {
  assert.match(loginSource, /getAdminLoginErrorMessage\(error\)/);
  assert.doesNotMatch(loginSource, /Network error\.\s*['"`]\s*\+/);

  assert.match(apiClientSource, /status === 401/);
  assert.doesNotMatch(apiClientSource, /Email or password is incorrect/);
  assert.match(apiClientSource, /We could not sign you in\. Please verify your admin access or try again\./);
  assert.match(apiClientSource, /status === 429/);
  assert.match(apiClientSource, /Too many sign-in attempts/);
  assert.match(apiClientSource, /status >= 500/);
  assert.match(apiClientSource, /Unable to reach the server/);
});

test('admin login tolerates slow or waking backends without retrying rejected credentials', () => {
  assert.match(apiClientSource, /LOGIN_MAX_ATTEMPTS\s*=\s*3/);
  assert.match(apiClientSource, /LOGIN_ATTEMPT_TIMEOUT_MS\s*=\s*60_000/);
  assert.match(apiClientSource, /RETRYABLE_LOGIN_STATUSES\s*=\s*new Set\(\[502, 503, 504\]\)/);
  assert.match(apiClientSource, /path === '\/api\/v1\/admin\/auth\/login'/);
  assert.match(apiClientSource, /await waitBeforeRetry\(attempt\)/);
  assert.match(loginSource, /login\(email\.trim\(\), password\)/);
});
