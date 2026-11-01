const test = require('node:test');
const assert = require('node:assert/strict');

const { isProductSaleable, normalizeSizeStock, resolveInitialStock } = require('../src/services/productStockService');

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

test('size inventory is normalized and total stock comes from its quantities', () => {
  const sizeStock = normalizeSizeStock([
    { size: '35', available: 2 },
    { size: '36', available: 0 },
    { size: '37', available: 3.9 },
  ]);

  assert.deepEqual(sizeStock, [
    { size: '35', available: 2, reserved: 0 },
    { size: '36', available: 0, reserved: 0 },
    { size: '37', available: 3, reserved: 0 },
  ]);
  assert.deepEqual(resolveInitialStock({ sizeStock }), { available: 5, inStock: true });
});
