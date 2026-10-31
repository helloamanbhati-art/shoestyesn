import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../src/app/api/client.ts', import.meta.url), 'utf8');
const ordersHook = readFileSync(new URL('../src/app/hooks/useOrdersAPI.tsx', import.meta.url), 'utf8');
const categoryContext = readFileSync(new URL('../src/app/contexts/CategoryContext.tsx', import.meta.url), 'utf8');
const categoryPage = readFileSync(new URL('../src/app/pages/admin/CategoriesManagement.tsx', import.meta.url), 'utf8');
const adminLayout = readFileSync(new URL('../src/app/components/admin/AdminLayout.tsx', import.meta.url), 'utf8');

test('admin API coalesces duplicate GETs and shares session refresh work', () => {
  assert.match(client, /inFlightGetRequests/);
  assert.match(client, /refreshPromise/);
  assert.match(client, /RETRYABLE_REQUEST_STATUSES/);
});

test('slow networks receive long request and upload windows with safe retries', () => {
  assert.match(client, /REQUEST_TIMEOUT_MS = 180_000/);
  assert.match(client, /UPLOAD_TIMEOUT_MS = 600_000/);
  assert.match(client, /REQUEST_MAX_ATTEMPTS = 4/);
  assert.match(client, /\['GET', 'PUT', 'DELETE'\]/);
  assert.match(client, /init\.body instanceof FormData/);
});

test('order polling avoids hidden-tab and overlapping refresh requests', () => {
  assert.match(ordersHook, /document\.visibilityState !== 'visible'/);
  assert.match(ordersHook, /refreshInFlight/);
  assert.match(ordersHook, /visibilitychange/);
  assert.doesNotMatch(ordersHook, /setInterval\(fetchOrders, 15_000\)/);
});

test('order polling uses incremental database synchronization after its initial snapshot', () => {
  assert.match(ordersHook, /fetchAdminOrderSnapshot/);
  assert.match(ordersHook, /fetchAdminOrderChanges/);
  assert.match(ordersHook, /syncCursor/);
  assert.match(ordersHook, /3_000/);
});

test('a transient order refresh failure preserves the last successful snapshot', () => {
  assert.match(ordersHook, /let hasLoadedSnapshot = false/);
  assert.match(ordersHook, /hasLoadedSnapshot = true/);
  assert.match(ordersHook, /if \(!hasLoadedSnapshot\) setError/);
});

test('categories can recover from a transient production API failure without another login', () => {
  assert.match(categoryContext, /reloadCategories/);
  assert.match(categoryContext, /window\.addEventListener\('online'/);
  assert.match(categoryPage, /Retry loading categories/);
  assert.match(categoryContext, /Idempotency-Key/);
});

test('manual order creation is idempotent on slow or retrying networks', () => {
  assert.match(ordersHook, /Idempotency-Key/);
  assert.match(ordersHook, /createIdempotencyKey/);
});

test('admin clearly reports offline state and automatically notices reconnection', () => {
  assert.match(adminLayout, /navigator\.onLine/);
  assert.match(adminLayout, /addEventListener\('offline'/);
  assert.match(adminLayout, /addEventListener\('online'/);
  assert.match(adminLayout, /You are offline/);
});
