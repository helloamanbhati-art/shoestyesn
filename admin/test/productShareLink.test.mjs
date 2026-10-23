import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProductShareUrl } from '../src/app/utils/productShareLink.mjs';

const productsManagementSource = readFileSync(
  new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url),
  'utf8',
);

test('buildProductShareUrl points to the public storefront share route', () => {
  assert.equal(
    buildProductShareUrl('product 123', null, 'https://shop.example.com/'),
    'https://shop.example.com/share/product/product%20123',
  );
});

test('buildProductShareUrl preserves a selected product variant', () => {
  assert.equal(
    buildProductShareUrl('product-123', 'red & gold', 'https://shop.example.com'),
    'https://shop.example.com/share/product/product-123?variant=red+%26+gold',
  );
});

test('admin share links default to the public Shoe Fashion storefront domain', () => {
  assert.match(productsManagementSource, /https:\/\/shoefashion\.in/);
  assert.doesNotMatch(productsManagementSource, /gujjus/i);
  assert.doesNotMatch(productsManagementSource, /amanbhati\.vercel\.app/);
});
