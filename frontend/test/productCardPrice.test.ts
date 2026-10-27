import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardSource = readFileSync(
  new URL('../src/app/components/ProductCard.tsx', import.meta.url),
  'utf8',
);

test('product cards do not render a zero when the original price is zero', () => {
  assert.match(cardSource, /const hasDiscount = \(product\.compareAtPrice \?\? 0\) > product\.price;/);
  assert.match(cardSource, /\{hasDiscount && \(/);
  assert.doesNotMatch(cardSource, /\{product\.compareAtPrice && product\.compareAtPrice > product\.price && \(/);
});

test('a valid original price is shown with a strikethrough', () => {
  assert.match(cardSource, /line-through/);
  assert.match(cardSource, /product\.compareAtPrice\.toLocaleString\('en-IN'\)/);
});

test('product details use the compact sale format from the catalog reference', () => {
  assert.match(cardSource, /uppercase/);
  assert.match(cardSource, /line-clamp-2/);
  assert.match(cardSource, /bg-emerald-800/);
  assert.match(cardSource, /\{discountPercentage\}% OFF/);
  assert.doesNotMatch(cardSource, /\(\{discountPercentage\}% off\)/);
});
