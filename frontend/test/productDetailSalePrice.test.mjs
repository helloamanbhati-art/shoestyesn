import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/ProductDetail.tsx', import.meta.url),
  'utf8',
);

test('product detail shows the old MRP when a product has a lower sale price', () => {
  assert.match(source, /\(product\.compareAtPrice \?\? 0\) > product\.price/);
  assert.match(source, /line-through/);
  assert.match(source, /Math\.round\(\(1 - product\.price \/ product\.compareAtPrice\) \* 100\)/);
  assert.match(source, /bg-emerald-800/);
  assert.match(source, /-\{discountPercentage\}% OFF/);
  assert.doesNotMatch(source, /Save ₹/);
});
