import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/app/components/Navbar.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/pages/Layout.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('homepage follows the premium reference content structure', () => {
  for (const copy of ['Free pan-India delivery', 'Easy size exchange', 'Secure checkout', 'New arrivals']) {
    assert.match(home.replace(/<[^>]+>/g, ' '), new RegExp(copy, 'i'));
  }
  assert.match(home, /storefront-hero-cta/);
});

test('homepage does not impersonate an Instagram integration', () => {
  assert.doesNotMatch(home, /SEEN ON YOU|Instagram post/i);
  assert.doesNotMatch(home, /CAMPAIGN STUDIES/);
});

test('navigation exposes the requested luxury shopping destinations', () => {
  assert.doesNotMatch(nav, /Wishlist/);
  assert.match(home, /Search/);
  assert.match(nav, /ShoppingBag/);
});

test('storefront uses the white, cream, black, burgundy and mint identity', () => {
  assert.doesNotMatch(`${home}\n${layout}`, /#(?:ff4f79|E21B2D|F15A32)/i);
  assert.match(nav, /storefront-accent/);
  assert.match(`${home}\n${layout}`, /bg-white/);
});

test('shopping benefits are full-width and compact at desktop and mobile sizes', () => {
  assert.match(styles, /\.storefront-benefits\s*\{[^}]*width:\s*100%;/s);
  assert.doesNotMatch(styles, /\.storefront-benefits\s*\{[^}]*margin-inline:/s);
  assert.doesNotMatch(styles, /\.storefront-benefits\s*\{[^}]*mask:/s);
  assert.match(styles, /\.storefront-benefits\s*\{[^}]*padding-block:\s*8px;/s);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.storefront-benefits\s*\{[^}]*padding-block:\s*6px;/);
});

test('shopping benefits move left to right in one horizontal line', () => {
  assert.match(home, /storefront-benefits-track/);
  assert.match(styles, /\.storefront-benefits-track\s*\{[^}]*display:\s*flex;/s);
  assert.match(styles, /animation:\s*benefits-ticker/);
  assert.match(styles, /@keyframes benefits-ticker[\s\S]*translateX\(-50%\)[\s\S]*translateX\(0\)/);
});
