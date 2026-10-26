import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/pages/Layout.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/app/components/ProductCard.tsx', import.meta.url), 'utf8');

test('editorial storefront does not publish unconfigured promotional claims', () => {
  const source = `${home}\n${layout}`;
  assert.doesNotMatch(source, /20% OFF/i);
  assert.doesNotMatch(source, /10% off your first order/i);
  assert.doesNotMatch(source, /free shipping over/i);
});

test('homepage uses Shoe Style bold campaign messaging and footwear collections', () => {
  assert.match(home, /WALK LOUD/);
  assert.match(home, /LATEST DROPS/);
  assert.match(home, /FOR HER/);
  assert.match(home, /GOOD SHOES[\s\S]*BIG ENERGY/);
});

test('product cards expose alternate imagery on hover when available', () => {
  assert.match(card, /secondaryMedia/);
  assert.match(card, /group-hover:opacity-100/);
});
