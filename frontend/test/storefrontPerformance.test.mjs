import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const productsSource = fs.readFileSync(path.resolve(dirname, '../src/app/hooks/useProducts.ts'), 'utf8');
const gridSource = fs.readFileSync(path.resolve(dirname, '../src/app/components/ProductGrid.tsx'), 'utf8');
const cardSource = fs.readFileSync(path.resolve(dirname, '../src/app/components/ProductCard.tsx'), 'utf8');
const productContextSource = fs.readFileSync(path.resolve(dirname, '../src/app/contexts/ProductContext.tsx'), 'utf8');
const categoryShowcaseSource = fs.readFileSync(path.resolve(dirname, '../src/app/components/CategoryShowcase.tsx'), 'utf8');
const trendingStylesSource = fs.readFileSync(path.resolve(dirname, '../src/app/components/TrendingStyles.tsx'), 'utf8');
const apiClientSource = fs.readFileSync(path.resolve(dirname, '../src/app/api/client.ts'), 'utf8');

test('storefront requests compact cards and restores a persistent product cache', () => {
  assert.match(productsSource, /view=card/);
  assert.match(productsSource, /localStorage\.getItem/);
  assert.match(productsSource, /localStorage\.setItem/);
});

test('cold storefront visits render the first catalog page before the full catalog finishes', () => {
  assert.match(productsSource, /INITIAL_PRODUCT_PAGE_SIZE = 24/);
  assert.match(productsSource, /onFirstPage/);
  assert.match(productsSource, /setLoading\(false\)/);
});

test('the first product images are prioritized while off-screen cards remain deferred', () => {
  assert.match(gridSource, /priority=\{index < 4\}/);
  assert.match(cardSource, /fetchPriority=\{priority && index === 0 \? 'high' : 'auto'\}/);
  assert.match(cardSource, /loading=\{priority && index === 0 \? 'eager' : 'lazy'\}/);
  assert.match(cardSource, /contentVisibility: 'auto'/);
});

test('the hero can render from the first product page while secondary media stays deferred', () => {
  assert.match(productContextSource, /products\.map\(\(product\) => product\.category\)/);
  assert.match(categoryShowcaseSource, /loading="lazy"/);
  assert.match(trendingStylesSource, /loading="lazy"/);
  assert.match(categoryShowcaseSource, /preload="none"/);
  assert.match(trendingStylesSource, /preload="none"/);
});

test('storefront reads tolerate slow and temporarily failing networks', () => {
  assert.match(apiClientSource, /READ_TIMEOUT_MS = 120_000/);
  assert.match(apiClientSource, /READ_MAX_ATTEMPTS = 3/);
  assert.match(apiClientSource, /export async function resilientFetch/);
  assert.match(productsSource, /resilientFetch/);
});
