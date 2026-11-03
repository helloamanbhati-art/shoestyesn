import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const router = readFileSync(new URL('../src/app/routes.tsx', import.meta.url), 'utf8');
const boundary = readFileSync(new URL('../src/app/components/ErrorBoundary.tsx', import.meta.url), 'utf8');

test('storefront catches failures above and inside the router', () => {
  assert.match(app, /<ErrorBoundary>/);
  assert.match(router, /errorElement:\s*<ProductionErrorScreen/);
});

test('storefront production fallback does not render raw exception details', () => {
  assert.doesNotMatch(boundary, /this\.state\.error\?\.message/);
  assert.doesNotMatch(boundary, /error\.stack/);
  assert.match(boundary, /Refresh page/);
});

test('every deferred route shows a visible loading state instead of a blank page', () => {
  assert.match(router, /function PageLoadingState/);
  assert.match(router, /role="status"/);
  assert.match(router, /Loading the collection/);
  assert.match(router, /animate-pulse/);
  assert.match(router, /<Suspense fallback=\{<PageLoadingState \/>\}>/);
});
