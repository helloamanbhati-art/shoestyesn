import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const categoryPageSource = readFileSync(
  new URL('../src/app/pages/CategoryProducts.tsx', import.meta.url),
  'utf8',
);

test('collection header and controls use the editorial mobile treatment', () => {
  assert.match(categoryPageSource, /bg-\[#F7F3ED\]/);
  assert.doesNotMatch(categoryPageSource, /> Browse collection</);
  assert.match(categoryPageSource, /aria-label="Back to collections"/);
  assert.match(categoryPageSource, /ArrowLeft[^>]*\/>\s*<\/Link>\s*<h1/);
  assert.match(categoryPageSource, /px-3 py-3[^\"]*md:px-8 md:py-4/);
  assert.match(categoryPageSource, /text-\[1\.75rem\][^\"]*md:text-\[2\.25rem\]/);
  assert.match(categoryPageSource, /grid-cols-2[^\"]*md:flex/);
  assert.match(categoryPageSource, /aria-label="Sort products"/);
  assert.match(categoryPageSource, /appearance-none[^\"]*rounded-full/);
});
