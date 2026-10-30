import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url), 'utf8');

test('admin product management loads the complete protected catalog', () => {
  assert.match(source, /\/api\/v1\/admin\/products\?limit=500/);
  assert.doesNotMatch(source, /\/api\/v1\/products\?limit=500/);
});

test('admin product management exposes loading, error, and manual refresh states', () => {
  assert.match(source, /isLoadingProducts/);
  assert.match(source, /productsLoadError/);
  assert.match(source, /Refresh products/);
});
