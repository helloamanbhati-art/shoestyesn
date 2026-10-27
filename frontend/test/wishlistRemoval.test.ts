import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sourceFiles = [
  '../src/app/routes.tsx',
  '../src/app/components/Navbar.tsx',
  '../src/app/components/ProductCard.tsx',
  '../src/app/pages/ProductDetail.tsx',
];

test('the storefront does not expose wishlist controls or routes', () => {
  for (const file of sourceFiles) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /wishlist/i, `${file} still exposes wishlist functionality`);
  }
});
