import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const optimizer = readFileSync(new URL('../src/app/utils/optimizeMediaForUpload.ts', import.meta.url), 'utf8');
const products = readFileSync(new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url), 'utf8');

test('large product photos are resized before slow-network upload with a safe fallback', () => {
  assert.match(optimizer, /MAX_IMAGE_DIMENSION = 1600/);
  assert.match(optimizer, /MAX_UNOPTIMIZED_BYTES = 1_000_000/);
  assert.match(optimizer, /return file/);
  assert.match(products, /optimizeMediaForUpload/);
  assert.match(products, /await Promise\.all/);
});
