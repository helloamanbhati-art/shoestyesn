import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardSource = readFileSync(new URL('../src/app/components/ProductCard.tsx', import.meta.url), 'utf8');
const detailSource = readFileSync(new URL('../src/app/pages/ProductDetail.tsx', import.meta.url), 'utf8');

test('clicking a product card opens that exact product detail page', () => {
  assert.match(cardSource, /to={`\/product\/\$\{product\.id\}`}/);
  assert.match(detailSource, /fetch\(`\$\{API_BASE_URL\}\/api\/v1\/products\/\$\{id\}`\)/);
  assert.match(detailSource, /<img src=\{activeMedia\} alt=\{`\$\{product\.name\}/);
});

test('product cards omit the brand name', () => {
  assert.doesNotMatch(cardSource, /\{product\.brand\}/);
});

test('product detail provides a full-width back-to-products navigation bar', () => {
  assert.match(detailSource, /<nav aria-label="Product navigation" className="product-detail-back-bar [^"]+">/);
  assert.match(detailSource, /<Link to="\/" className="product-detail-back-link [^"]+">/);
  assert.match(detailSource, /<ArrowLeft[^>]*aria-hidden="true"/);
});
