import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const categoryPageSource = readFileSync(
  new URL('../src/app/pages/CategoryProducts.tsx', import.meta.url),
  'utf8',
);

test('collection page opens directly on the product grid without listing controls', () => {
  assert.doesNotMatch(categoryPageSource, /<header/);
  assert.doesNotMatch(categoryPageSource, /Sort products/);
  assert.doesNotMatch(categoryPageSource, /Collection filters/);
  assert.match(categoryPageSource, /<Link to="\/" aria-label="Back to collections"/);
  assert.match(categoryPageSource, /<ArrowLeft[^>]*\/>\s*<span>Back<\/span>/);
  assert.match(categoryPageSource, /<main[^>]*>[\s\S]*Back[\s\S]*\{loading/);
});

test('collection page always explains loading and failure states', () => {
  assert.match(categoryPageSource, /Loading this collection/);
  assert.match(categoryPageSource, /role="status"/);
  assert.match(categoryPageSource, /We couldn't load this collection/);
  assert.match(categoryPageSource, /to="\/products"[\s\S]*Browse all products/);
});
