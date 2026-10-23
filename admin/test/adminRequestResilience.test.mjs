import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../src/app/api/client.ts', import.meta.url), 'utf8');
const ordersHook = readFileSync(new URL('../src/app/hooks/useOrdersAPI.tsx', import.meta.url), 'utf8');

test('admin API coalesces duplicate GETs and shares session refresh work', () => {
  assert.match(client, /inFlightGetRequests/);
  assert.match(client, /refreshPromise/);
  assert.match(client, /RETRYABLE_REQUEST_STATUSES/);
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
