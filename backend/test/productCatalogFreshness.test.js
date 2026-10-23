const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const productController = readFileSync(
  join(__dirname, '../src/controllers/productController.js'),
  'utf8',
);

test('public product listings require revalidation after an admin update', () => {
  assert.match(productController, /Cache-Control", "no-store, max-age=0"/);
  assert.doesNotMatch(productController, /s-maxage=300/);
});
