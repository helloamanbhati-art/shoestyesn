import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(
  new URL('../src/app/components/admin/AdminLayout.tsx', import.meta.url),
  'utf8',
);
const router = readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const management = readFileSync(
  new URL('../src/app/pages/admin/ProductOptionsManagement.tsx', import.meta.url),
  'utf8',
);

test('admin navigation replaces Brands and Product Options with Footwear Types', () => {
  assert.match(layout, /label: 'Footwear Types', path: '\/admin\/footwear-types'/);
  assert.doesNotMatch(layout, /label: 'Brands'/);
  assert.doesNotMatch(layout, /label: 'Product Options'/);
  assert.match(router, /path: 'footwear-types',[\s\S]*element: <ProductOptionsManagement \/>/);
});

test('footwear types can be added, renamed, removed, and saved', () => {
  assert.match(management, /Add footwear type/);
  assert.match(management, /updateTypeAtIndex/);
  assert.match(management, /aria-label=\{`Edit \$\{type\}`\}/);
  assert.match(management, /aria-label=\{`Remove \$\{type\}`\}/);
  assert.match(management, /Save Footwear Types/);
  assert.match(management, /JSON\.stringify\(\{ sizes, clothingTypes: cleanedTypes \}\)/);
});
