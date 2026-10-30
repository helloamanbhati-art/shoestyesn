import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveAdminApiBaseUrl } from '../src/app/api/apiBaseUrl.mjs';

test('production always uses the same-origin proxy even when VITE_API_URL is set', () => {
  assert.equal(resolveAdminApiBaseUrl({ dev: false, configuredUrl: 'https://api.example.test' }), '');
});

test('development can use the configured backend URL', () => {
  assert.equal(
    resolveAdminApiBaseUrl({ dev: true, configuredUrl: 'http://localhost:4000/' }),
    'http://localhost:4000',
  );
  assert.equal(resolveAdminApiBaseUrl({ dev: true }), 'http://localhost:3000');
});

test('database-backed admin screens use the resilient authenticated request client', () => {
  const files = [
    '../src/app/contexts/CategoryContext.tsx',
    '../src/app/contexts/BrandContext.tsx',
    '../src/app/hooks/useOrdersAPI.tsx',
    '../src/app/pages/admin/ProductsManagement.tsx',
  ];

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /admin(?:Request|Fetch)/, file);
  }
});

test('product creation keeps one idempotency key and allows safe automatic retries', () => {
  const client = readFileSync(new URL('../src/app/api/client.ts', import.meta.url), 'utf8');
  const products = readFileSync(
    new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url),
    'utf8',
  );

  assert.match(client, /Idempotency-Key/);
  assert.match(products, /productCreationKeyRef/);
  assert.match(products, /'Idempotency-Key'/);
});
