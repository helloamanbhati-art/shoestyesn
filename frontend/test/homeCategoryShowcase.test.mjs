import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const showcaseSource = readFileSync(new URL('../src/app/components/CategoryShowcase.tsx', import.meta.url), 'utf8');
const categoryPageSource = readFileSync(new URL('../src/app/pages/CategoryProducts.tsx', import.meta.url), 'utf8');
const routesSource = readFileSync(new URL('../src/app/routes.tsx', import.meta.url), 'utf8');

test('the dynamic statement showcase appears between the hero and full catalog', () => {
  const tickerPosition = homeSource.indexOf('New season drops');
  const showcasePosition = homeSource.indexOf('MAKE YOUR MOVE');
  const catalogPosition = homeSource.indexOf('id="shop"');

  assert.ok(tickerPosition >= 0, 'expected the post-banner promotion strip');
  assert.ok(showcasePosition > tickerPosition, 'expected categories after the banner strip');
  assert.ok(catalogPosition > showcasePosition, 'expected categories before the full catalog');
  assert.match(homeSource, /moodDefinitions/);
});

test('the showcase derives one representative product per live category', () => {
  assert.match(showcaseSource, /products\.reduce/);
  assert.match(showcaseSource, /new Map<string, Product>/);
  assert.match(showcaseSource, /\/category\/\$\{encodeURIComponent\(product\.category\)\}/);
  assert.match(showcaseSource, /product\.image/);
});

test('category cards open a dedicated product-listing route', () => {
  assert.match(routesSource, /path: 'category\/:category'/);
  assert.match(categoryPageSource, /useParams/);
  assert.match(categoryPageSource, /product\.category\.toLocaleLowerCase/);
  assert.match(categoryPageSource, /<ProductGrid products=\{visibleProducts\}/);
});
