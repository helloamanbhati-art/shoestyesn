const test = require('node:test');
const assert = require('node:assert/strict');

const { isProductSaleable, resolveInitialStock } = require('../src/services/productStockService');

test('new products default to available stock', () => {
  assert.deepEqual(resolveInitialStock({}), {
    available: 100,
    inStock: true,
  });
});

test('an explicitly out-of-stock product starts with zero availability', () => {
  assert.deepEqual(resolveInitialStock({ inStock: false }), {
    available: 0,
    inStock: false,
  });
});

test('an explicit stock quantity controls initial availability', () => {
  assert.deepEqual(resolveInitialStock({ stock: { available: 12 } }), {
    available: 12,
    inStock: true,
  });
});

test('zero explicit stock is preserved', () => {
  assert.deepEqual(resolveInitialStock({ stock: { available: 0 } }), {
    available: 0,
    inStock: false,
  });
});

test('saleability uses available stock rather than reserved stock or a stale flag', () => {
  assert.equal(isProductSaleable({
    isActive: true,
    trackInventory: true,
    inStock: false,
    stock: { available: 1, reserved: 10 },
  }), true);
  assert.equal(isProductSaleable({
    isActive: true,
    trackInventory: true,
    inStock: true,
    stock: { available: 0, reserved: 10 },
  }), false);
  assert.equal(isProductSaleable({
    isActive: true,
    trackInventory: false,
    stock: { available: 0, reserved: 0 },
  }), true);
});
