import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync(
  new URL('../src/app/components/FilterSidebar.tsx', import.meta.url),
  'utf8',
);

test('shop sidebar omits sale navigation and brand filters', () => {
  assert.doesNotMatch(sidebarSource, /label="Sale"/);
  assert.doesNotMatch(sidebarSource, /label="Brands"/);
});

test('size filters show the lowest offered price instead of a product count', () => {
  const filtersSource = readFileSync(
    new URL('../src/app/hooks/useProductFilters.ts', import.meta.url),
    'utf8',
  );

  assert.match(filtersSource, /startingPrice/);
  assert.match(sidebarSource, /From ₹/);
  assert.match(sidebarSource, /sizeCounts\.map\(\(\{ size, count, startingPrice \}\)/);
});

test('storefront size filters present footwear sizes as EU sizes', () => {
  assert.match(sidebarSource, /label="EU Sizes"/);
  assert.match(sidebarSource, /getEuShoeSize\(size\)/);
  assert.match(sidebarSource, /aria-label={`EU size/);
});

test('product type filter uses a recognizable footwear icon instead of a shirt icon', () => {
  assert.match(sidebarSource, /icon=\{Footprints\}/);
  assert.doesNotMatch(sidebarSource, /function HighHeelIcon/);
  assert.doesNotMatch(sidebarSource, /icon=\{Shirt\}/);
});
