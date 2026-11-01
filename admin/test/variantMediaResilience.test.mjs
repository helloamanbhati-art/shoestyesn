import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manager = readFileSync(
  new URL('../src/app/components/admin/VariantManager.tsx', import.meta.url),
  'utf8',
);

test('variant media never exposes a broken browser image and releases local previews', () => {
  assert.match(manager, /function VariantMediaPreview/);
  assert.match(manager, /onError=\{\(\) => setLoadFailed\(true\)\}/);
  assert.match(manager, /Image unavailable/);
  assert.match(manager, /URL\.revokeObjectURL/);
});
