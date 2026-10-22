import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const productsSource = fs.readFileSync(path.resolve(dirname, '../src/app/hooks/useProducts.ts'), 'utf8');
const gridSource = fs.readFileSync(path.resolve(dirname, '../src/app/components/ProductGrid.tsx'), 'utf8');
const cardSource = fs.readFileSync(path.resolve(dirname, '../src/app/components/ProductCard.tsx'), 'utf8');

test('storefront requests compact cards and restores a persistent product cache', () => {
  assert.match(productsSource, /view=card/);
  assert.match(productsSource, /localStorage\.getItem/);
  assert.match(productsSource, /localStorage\.setItem/);
});

test('the first product images are prioritized while off-screen cards remain deferred', () => {
  assert.match(gridSource, /priority=\{index < 4\}/);
  assert.match(cardSource, /fetchPriority=\{priority \? 'high' : 'auto'\}/);
  assert.match(cardSource, /loading=\{priority \? 'eager' : 'lazy'\}/);
  assert.match(cardSource, /contentVisibility: 'auto'/);
});
