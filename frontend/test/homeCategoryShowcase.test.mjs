import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const showcaseSource = readFileSync(new URL('../src/app/components/CategoryShowcase.tsx', import.meta.url), 'utf8');
const categoryPageSource = readFileSync(new URL('../src/app/pages/CategoryProducts.tsx', import.meta.url), 'utf8');
const routesSource = readFileSync(new URL('../src/app/routes.tsx', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('the live hero links every backend-derived banner to its category collection', () => {
  assert.match(homeSource, /categories\.map\(\(category, index\)/);
  assert.match(homeSource, /href: `\/category\/\$\{encodeURIComponent\(category\)\}`/);
  assert.match(homeSource, /index === 0 \? bannerUrl/);
  assert.match(homeSource, /to=\{activeHero\.href\}/);
});

test('the showcase derives one representative product per live category', () => {
  assert.match(showcaseSource, /products\.reduce/);
  assert.match(showcaseSource, /new Map<string, Product>/);
  assert.match(showcaseSource, /\/category\/\$\{encodeURIComponent\(product\.category\)\}/);
  assert.match(showcaseSource, /product\.image/);
});

test('all live product categories appear immediately after the banner, before new arrivals', () => {
  const heroPosition = homeSource.indexOf('<section className="storefront-hero"');
  const showcasePosition = homeSource.indexOf('<CategoryShowcase products={products}');
  const arrivalsPosition = homeSource.indexOf('<NewArrivalsRail products={collection}');

  assert.ok(heroPosition >= 0, 'expected the homepage banner');
  assert.ok(showcasePosition > heroPosition, 'expected categories after the banner');
  assert.ok(arrivalsPosition > showcasePosition, 'expected categories before new arrivals');
  assert.match(homeSource, /products\.slice\(0, 8\)/);
  assert.match(showcaseSource, /categoryPriority = \['Sandals', 'Boots', 'Heels'\]/);
  assert.match(showcaseSource, /Array\.from\(representatives\.values\(\)\)/);
  assert.match(showcaseSource, /categoryPriority\.indexOf/);
  assert.doesNotMatch(showcaseSource, /\.map\(\(category\) => representatives\.get/);
  assert.doesNotMatch(showcaseSource, /Find your pair|Shop by category/i);
});

test('the new-arrivals rail offers navigation and links to the full live collection', () => {
  assert.match(homeSource, /aria-label="Previous new arrivals"/);
  assert.match(homeSource, /aria-label="Next new arrivals"/);
  assert.match(homeSource, /to="\/products"/);
  assert.match(homeSource, /View all products/);
});

test('categories wrap and expand the section without leaving a fixed empty gap', () => {
  assert.doesNotMatch(homeSource, /Just dropped/i);
  assert.match(stylesSource, /\.category-showcase-rail\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(/);
  assert.doesNotMatch(stylesSource, /\.category-showcase-rail\s*\{[^}]*grid-auto-flow:\s*column/);
  assert.doesNotMatch(stylesSource, /\.category-showcase-rail\s*\{[^}]*overflow-x:\s*auto/);
});

test('mobile category cards display four items per row', () => {
  assert.match(
    stylesSource,
    /@media[^}]*max-width:\s*767px[\s\S]*?\.category-showcase-rail\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
  );
});

test('a single mobile category row does not leave a large gap before new arrivals', () => {
  assert.match(showcaseSource, /categoryProducts\.length <= 4 \? ' is-single-row' : ''/);
  assert.match(
    stylesSource,
    /\.category-showcase\.is-single-row\s*\+\s*\.new-arrivals\s*\{[^}]*padding-top:\s*8px/,
  );
});

test('category cards open a dedicated product-listing route', () => {
  assert.match(routesSource, /path: 'category\/:category'/);
  assert.match(categoryPageSource, /useParams/);
  assert.match(categoryPageSource, /product\.category\.toLocaleLowerCase/);
  assert.match(categoryPageSource, /<ProductGrid products=\{categoryProducts\}/);
});
