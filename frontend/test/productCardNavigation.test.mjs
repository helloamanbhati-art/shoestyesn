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
