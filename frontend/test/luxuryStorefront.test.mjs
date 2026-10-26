import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/app/components/Navbar.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/pages/Layout.tsx', import.meta.url), 'utf8');

test('homepage follows the Shoe Style 2.0 editorial content structure', () => {
  for (const copy of [
    'WALK LOUD.',
    'YOUR STYLE. YOUR RULES.',
    'LATEST DROPS',
    'FOR HER.',
    'THE HIGH LIFE',
    'OFF-DUTY ICONS',
    'POWER MOVES',
    'TRENDING RIGHT NOW',
    'EVERYDAY ICONS',
  ]) assert.match(home.replace(/<[^>]+>/g, ' '), new RegExp(copy.replace(/[.]/g, '\\.')));
  assert.match(home, /GOOD SHOES[\s\S]*BIG ENERGY/);
});

test('homepage does not impersonate an Instagram integration', () => {
  assert.doesNotMatch(home, /SEEN ON YOU|Instagram post/i);
  assert.match(home, /CAMPAIGN STUDIES/);
});

test('navigation exposes the requested luxury shopping destinations', () => {
  assert.match(nav, /Wishlist/);
  assert.match(nav, /Search/);
  assert.match(nav, /ShoppingBag/);
});

test('storefront uses a black, white, and neutral-gray identity', () => {
  assert.doesNotMatch(`${home}\n${layout}`, /#(?:ff4f79|6f1d2b|E21B2D|F15A32)/i);
  assert.match(`${home}\n${layout}`, /bg-black/);
  assert.match(`${home}\n${layout}`, /bg-white/);
});
