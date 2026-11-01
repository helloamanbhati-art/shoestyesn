import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildStockRequestMessage } from '../src/app/utils/stockRequest.ts';

const productDetail = readFileSync(new URL('../src/app/pages/ProductDetail.tsx', import.meta.url), 'utf8');

test('out-of-stock request includes the exact product, size, image, and product page', () => {
  const message = buildStockRequestMessage({
    productName: 'Black Crystal Heel',
    productCode: 'ABC12345',
    size: '38',
    shareUrl: 'https://shoestyle.example/share/product/123',
  });

  assert.match(message, /Black Crystal Heel/);
  assert.match(message, /EU size: 38/);
  assert.match(message, /ABC12345/);
  assert.match(message, /https:\/\/shoestyle\.example\/share\/product\/123/);
  assert.equal(message.match(/https:\/\//g)?.length, 1, 'WhatsApp receives exactly one link so it can generate a preview');
  assert.match(message, /available/i);
});

test('product detail sends the rich product share route used for image previews', () => {
  assert.match(productDetail, /\/share\/product\/\$\{encodeURIComponent\(product\.id\)\}/);
  assert.match(productDetail, /shareUrl/);
  assert.doesNotMatch(productDetail, /imageUrl: stockRequestImage/);
});

test('unavailable sizes remain actionable and open a confirmation dialog', () => {
  assert.doesNotMatch(productDetail, /disabled={!option\.available}/);
  assert.match(productDetail, /setStockRequestOption\(option\)/);
  assert.match(productDetail, /sizeOptions\.length > 0/);
  assert.match(productDetail, /Request this size on WhatsApp/);
  assert.match(productDetail, /AlertDialog/);
});

test('products with size inventory do not replace sold-out sizes with catalog fallback sizes', () => {
  assert.match(productDetail, /!productData\.sizeStock\?\.length/);
});
