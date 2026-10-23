import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const productsHook = readFileSync(
  new URL('../src/app/hooks/useProducts.ts', import.meta.url),
  'utf8',
);

test('the storefront bypasses stale browser and CDN product caches', () => {
  assert.match(productsHook, /cache:\s*'no-store'/);
  assert.match(productsHook, /catalogRefresh=/);
});

test('an open storefront refreshes products after admin changes', () => {
  assert.match(productsHook, /window\.addEventListener\('focus', refreshProducts\)/);
  assert.match(productsHook, /document\.addEventListener\('visibilitychange', refreshVisibleProducts\)/);
  assert.match(productsHook, /setInterval\(refreshProducts, PRODUCT_REFRESH_INTERVAL_MS\)/);
  assert.match(productsHook, /PRODUCT_REFRESH_INTERVAL_MS\s*=\s*10_000/);
});
