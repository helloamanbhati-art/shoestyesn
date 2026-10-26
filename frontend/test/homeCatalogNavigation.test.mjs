import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const sidebarSource = readFileSync(new URL('../src/app/components/FilterSidebar.tsx', import.meta.url), 'utf8');
const mobileCategoriesSource = readFileSync(new URL('../src/app/components/MobileCategoryNav.tsx', import.meta.url), 'utf8');

test('home omits the complete collection catalog section and its controls', () => {
  assert.doesNotMatch(homeSource, /The complete collection/i);
  assert.doesNotMatch(homeSource, /ALL FOOTWEAR/);
  assert.doesNotMatch(homeSource, /<ProductGrid/);
  assert.doesNotMatch(homeSource, /<FilterSidebar/);
  assert.doesNotMatch(homeSource, /<MobileCategoryNav/);
  assert.doesNotMatch(homeSource, /#shop/);
});

test('category clicks select one complete category and clear competing views', () => {
  assert.match(sidebarSource, /navigate\(`\/\?category=\$\{encodeURIComponent\(category\)\}`\)/);
  assert.match(sidebarSource, /selectedCategories: \[category\]/);
});

test('the reusable mobile category navigation remains accessible', () => {
  assert.match(mobileCategoriesSource, /aria-label="Product categories"/);
  assert.match(mobileCategoriesSource, /aria-pressed=\{isAllSelected\}/);
  assert.match(mobileCategoriesSource, /aria-pressed=\{selectedCategory === category\}/);
  assert.match(mobileCategoriesSource, /md:hidden/);
});
