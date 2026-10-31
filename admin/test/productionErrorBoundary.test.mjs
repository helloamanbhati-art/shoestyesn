import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const router = readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const boundary = readFileSync(new URL('../src/app/components/ProductionErrorBoundary.tsx', import.meta.url), 'utf8');

test('admin catches failures above and inside the router', () => {
  assert.match(app, /<ProductionErrorBoundary>/);
  assert.match(router, /errorElement:\s*<ProductionErrorScreen/);
});

test('admin production recovery screen never renders exception details or stack traces', () => {
  assert.match(boundary, /Something went wrong/);
  assert.match(boundary, /Try again/);
  assert.match(boundary, /Back to dashboard/);
  assert.doesNotMatch(boundary, /error\.message/);
  assert.doesNotMatch(boundary, /error\.stack/);
  assert.doesNotMatch(boundary, /componentStack/);
  assert.doesNotMatch(boundary, /useRouteError/);
});

test('admin recovery screen distinguishes offline state without exposing internals', () => {
  assert.match(boundary, /navigator\.onLine/);
  assert.match(boundary, /You appear to be offline/);
  assert.match(boundary, /addEventListener\('online'/);
});
