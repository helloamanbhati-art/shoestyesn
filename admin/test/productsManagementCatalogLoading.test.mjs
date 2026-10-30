import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url),
  'utf8',
);

test('admin product management requests the complete protected catalog', () => {
  assert.match(source, /\/api\/v1\/admin\/products\?limit=500/);
});
