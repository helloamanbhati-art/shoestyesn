import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url),
  'utf8',
);

test('admin product management requests the complete supported active catalog', () => {
  assert.match(source, /\/api\/v1\/products\?limit=500/);
});
