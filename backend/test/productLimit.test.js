const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.resolve(__dirname, '../src/controllers/productController.js'), 'utf8');

test('public product listing accepts at most 500 products per request', () => {
  assert.match(source, /Math\.min\(Math\.max\(Number\(req\.query\.limit\) \|\| 20, 1\), 500\)/);
});

test('storefront product listing uses a compact, immediately revalidated card response', () => {
  assert.match(source, /req\.query\.view === "card"/);
  assert.match(source, /CARD_PRODUCT_FIELDS/);
  assert.match(source, /\.lean\(\)/);
  assert.match(source, /no-store, max-age=0/);
});
