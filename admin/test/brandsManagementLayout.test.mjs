import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/BrandsManagement.tsx', import.meta.url),
  'utf8',
);

test('brands management keeps its primary content visible in a mobile viewport', () => {
  assert.match(source, /className="brands-management/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /min-h-\[7rem\]/);
  assert.doesNotMatch(source, /grid-cols-1 md:grid-cols-3 gap-6/);
});

test('brands management uses a flat square-edged presentation', () => {
  assert.match(source, /rounded-none/);
  assert.doesNotMatch(source, /bg-gradient-to-/);
  assert.match(source, /aria-label={`Edit \${brand\.name}`}/);
  assert.match(source, /aria-label={`Delete \${brand\.name}`}/);
});
