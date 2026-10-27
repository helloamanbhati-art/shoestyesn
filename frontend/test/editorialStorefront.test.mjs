import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/pages/Layout.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/app/components/ProductCard.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('editorial storefront does not publish unconfigured promotional claims', () => {
  const source = `${home}\n${layout}`;
  assert.doesNotMatch(source, /20% OFF/i);
  assert.doesNotMatch(source, /10% off your first order/i);
  assert.doesNotMatch(source, /free shipping over/i);
});

test('homepage uses the premium fashion-store structure and live collections', () => {
  assert.match(home, /storefront-benefits/);
  assert.match(home, /storefront-search/);
  assert.ok(
    home.indexOf('storefront-search') < home.indexOf('storefront-benefits'),
    'shopping guidance should appear after the search bar',
  );
  assert.match(home, /storefront-hero/);
  assert.match(home, /New arrivals/);
  assert.match(home, /products\.slice\(0, 8\)/);
});

test('product cards expose alternate imagery on hover when available', () => {
  assert.match(card, /secondaryMedia/);
  assert.match(card, /group-hover:opacity-100/);
});

test('mobile new arrivals alternate two compact cards with one full-width card', () => {
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.new-arrivals-rail\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(styles, /\.new-arrivals-card:nth-child\(3n\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/);
});
