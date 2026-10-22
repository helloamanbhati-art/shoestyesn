import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/app/pages/MyOrders.tsx', import.meta.url), 'utf8');
const context = readFileSync(new URL('../src/app/contexts/OrderContext.tsx', import.meta.url), 'utf8');
const storage = readFileSync(new URL('../src/app/guest/guestStorage.ts', import.meta.url), 'utf8');

test('order history is available without an authentication gate', () => {
  assert.doesNotMatch(page, /<AuthGate/);
  assert.match(page, /saved in this browser/i);
  assert.match(page, /void refreshOrders\(\)/);
});

test('signed-out order history loads only locally authorized guest orders', () => {
  assert.match(storage, /getGuestOrderIds/);
  assert.match(context, /getGuestOrderIds/);
  assert.match(context, /getOrder/);
  assert.match(context, /Promise\.allSettled/);
});
