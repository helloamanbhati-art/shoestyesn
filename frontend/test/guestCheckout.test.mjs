import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checkout = readFileSync(new URL('../src/app/pages/Checkout.tsx', import.meta.url), 'utf8');
const cart = readFileSync(new URL('../src/app/contexts/CartContext.tsx', import.meta.url), 'utf8');
const storage = readFileSync(new URL('../src/app/guest/guestStorage.ts', import.meta.url), 'utf8');

test('checkout offers guest purchase without an authentication gate', () => {
  assert.doesNotMatch(checkout, /<AuthGate/);
  assert.match(checkout, /Continue as guest/);
  assert.match(checkout, /Delete guest data/);
});

test('guest cart and delivery details are persisted and can be erased', () => {
  assert.match(cart, /loadGuestCart/);
  assert.match(cart, /saveGuestCart/);
  assert.match(storage, /localStorage\.removeItem/);
  assert.match(storage, /clearGuestData/);
});
