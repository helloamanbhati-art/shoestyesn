import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getEuShoeSize, isFootwearProduct, WOMEN_SHOE_SIZE_ROWS } from '../src/app/utils/womenShoeSizes.ts';

const productDetail = readFileSync(new URL('../src/app/pages/ProductDetail.tsx', import.meta.url), 'utf8');
const storeInformation = readFileSync(new URL('../src/app/pages/StoreInformation.tsx', import.meta.url), 'utf8');

test('product sizing includes an in-page size guide', () => {
  assert.match(productDetail, /<WomenSizeGuideDialog \/>/);
});

test('women size guide includes EU, UK, India, and foot length conversions', () => {
  for (const heading of ['EU Size', 'UK Size', 'India Size', 'Foot Length (cm)']) {
    assert.match(storeInformation, new RegExp(heading.replace(/[()]/g, '\\$&')));
  }

  assert.equal(WOMEN_SHOE_SIZE_ROWS[0].footLength, '22.0');
  assert.equal(WOMEN_SHOE_SIZE_ROWS[4].india, '6');
  assert.equal(WOMEN_SHOE_SIZE_ROWS.at(-1)?.footLength, '27.5');
});

test('size guide explains how to measure a foot', () => {
  assert.match(storeInformation, /heel to the longest toe/i);
});

test('legacy footwear sizes are presented as EU sizes', () => {
  assert.equal(getEuShoeSize('3'), '36');
  assert.equal(getEuShoeSize('6'), '39');
  assert.equal(getEuShoeSize('8'), '42');
  assert.equal(getEuShoeSize('35'), '35');
});

test('the selectable EU values come from the same women size guide', () => {
  assert.deepEqual(WOMEN_SHOE_SIZE_ROWS.map((row) => row.eu), ['35', '36', '37', '38', '39', '40', '41', '42', '43']);
  assert.match(productDetail, /getEuShoeSize\(size\)/);
  assert.match(productDetail, /WomenSizeGuideDialog/);
});

test('EU conversion is applied to footwear without changing clothing sizes', () => {
  assert.equal(isFootwearProduct({ name: 'Patent Stiletto Pumps', category: 'Heels' }), true);
  assert.equal(isFootwearProduct({ name: 'Cotton Kurti', category: 'Women' }), false);
});
