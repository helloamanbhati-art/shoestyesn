const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const productModel = readFileSync(join(__dirname, '../src/models/Product.js'), 'utf8');
const productController = readFileSync(join(__dirname, '../src/controllers/productController.js'), 'utf8');

test('products default to not showing the NEW badge', () => {
  assert.match(productModel, /isNewArrival:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/);
});

test('compact storefront product responses include the admin-controlled NEW flag', () => {
  assert.match(productController, /"isNewArrival"/);
});
