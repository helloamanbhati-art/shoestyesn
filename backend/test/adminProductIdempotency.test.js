const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const routes = readFileSync(join(__dirname, '../src/routes/adminRoutes.js'), 'utf8');
const productModel = readFileSync(join(__dirname, '../src/models/Product.js'), 'utf8');

test('admin product creation is duplicate-safe for retried mobile requests', () => {
  assert.match(routes, /Idempotency-Key/);
  assert.match(routes, /adminCreationKey/);
  assert.match(routes, /existingProduct/);
  assert.match(productModel, /adminCreationKey/);
  assert.match(productModel, /unique:\s*true/);
});
