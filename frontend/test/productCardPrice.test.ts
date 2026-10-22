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
