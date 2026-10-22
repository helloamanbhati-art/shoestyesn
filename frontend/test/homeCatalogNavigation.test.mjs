import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const sidebarSource = readFileSync(new URL('../src/app/components/FilterSidebar.tsx', import.meta.url), 'utf8');
const mobileCategoriesSource = readFileSync(new URL('../src/app/components/MobileCategoryNav.tsx', import.meta.url), 'utf8');

test('home and all-products views keep the complete product catalog visible', () => {
  assert.doesNotMatch(homeSource, /allProductDesigns/);
  assert.match(homeSource, /const visibleProducts = isSaleView[\s\S]*: filteredProducts;/);
});

test('category clicks select one complete category and clear competing views', () => {
  assert.match(sidebarSource, /navigate\(`\/\?category=\$\{encodeURIComponent\(category\)\}`\)/);
  assert.match(sidebarSource, /selectedCategories: \[category\]/);
});

test('mobile shoppers can select a product category above the catalog', () => {
  assert.match(homeSource, /<MobileCategoryNav/);
  assert.match(homeSource, /navigate\(`\/\?category=\$\{encodeURIComponent\(category\)\}`\)/);
  assert.match(mobileCategoriesSource, /aria-label="Product categories"/);
  assert.match(mobileCategoriesSource, /aria-pressed=\{isAllSelected\}/);
  assert.match(mobileCategoriesSource, /aria-pressed=\{selectedCategory === category\}/);
  assert.match(mobileCategoriesSource, /md:hidden/);
});
