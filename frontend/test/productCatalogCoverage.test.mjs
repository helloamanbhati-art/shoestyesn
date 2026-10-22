import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/hooks/useProducts.ts', import.meta.url),
  'utf8',
);

test('storefront requests enough products to display the complete active catalog', () => {
  assert.match(source, /\/api\/v1\/products\?limit=500/);
});

test('storefront follows every catalog page instead of treating the first response as complete', () => {
  assert.match(source, /fetchProductPage/);
  assert.match(source, /pagination\?\.pages/);
  assert.match(source, /page \+= 1/);
});

test('storefront always revalidates cached products when it mounts', () => {
  assert.doesNotMatch(source, /fetchAndCacheProducts\(\)/);
  assert.match(source, /fetchAndCacheProducts\(true\)/);
});
