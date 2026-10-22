import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const productDetail = readFileSync(new URL('../src/app/pages/ProductDetail.tsx', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../src/app/pages/Checkout.tsx', import.meta.url), 'utf8');

test('Buy Now is primary and sends the selected product directly to checkout', () => {
  const buyNowPosition = productDetail.indexOf('Buy now');
  const addToCartPosition = productDetail.indexOf('Add to cart');

  assert.ok(buyNowPosition >= 0);
  assert.ok(addToCartPosition > buyNowPosition);
  assert.match(productDetail, /await addToCart\(/);
  assert.match(productDetail, /navigate\('\/checkout'\)/);
});

test('checkout shows the exact products and selections before payment', () => {
  assert.match(checkout, /You're buying/);
  assert.match(checkout, /items\.map\(\(item\) =>/);
  assert.match(checkout, /item\.selectedVariant\?\.primaryImage/);
  assert.match(checkout, /item\.selectedSize/);
  assert.match(checkout, /item\.selectedComponents/);
  assert.match(checkout, /Quantity \{item\.quantity\}/);
});
