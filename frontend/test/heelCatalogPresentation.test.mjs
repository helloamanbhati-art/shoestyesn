import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hookSource = readFileSync(new URL('../src/app/hooks/useProducts.ts', import.meta.url), 'utf8');
const cardSource = readFileSync(new URL('../src/app/components/ProductCard.tsx', import.meta.url), 'utf8');
const filtersSource = readFileSync(new URL('../src/app/hooks/useProductFilters.ts', import.meta.url), 'utf8');
const sidebarSource = readFileSync(new URL('../src/app/components/FilterSidebar.tsx', import.meta.url), 'utf8');

test('product cards receive and display the catalog subtitle', () => {
  assert.match(hookSource, /shortDescription:\s*product\.shortDescription/);
  assert.match(cardSource, /product\.shortDescription/);
});

test('category navigation is derived only from categories that contain products', () => {
  assert.doesNotMatch(filtersSource, /\.\.\.managedCategories/);
  assert.doesNotMatch(sidebarSource, /STORE\.collections/);
  assert.match(sidebarSource, /categoryCounts\.filter\(\(\{ count \}\) => count > 0\)/);
});
