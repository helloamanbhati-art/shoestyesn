const test = require('node:test');
const assert = require('node:assert/strict');

const Product = require('../src/models/Product');
const inventoryService = require('../src/services/inventoryService');

test('reserveStock atomically moves available product stock into reserved stock', async (t) => {
  const state = { available: 3, reserved: 0 };

  t.mock.method(Product, 'findById', async () => ({ trackInventory: true }));
  t.mock.method(Product, 'findOneAndUpdate', async (_query, update) => {
    if (state.available < 2) return null;
    state.available += update.$inc['stock.available'];
    state.reserved += update.$inc['stock.reserved'];
    return { stock: { ...state }, inStock: state.available > 0 };
  });
  t.mock.method(Product, 'updateOne', async () => ({ acknowledged: true }));

  const result = await inventoryService.reserveStock('product-1', 2);

  assert.deepEqual(state, { available: 1, reserved: 2 });
  assert.deepEqual(result.stock, { available: 1, reserved: 2 });
});

test('reserveStock rejects a request when authoritative product stock is insufficient', async (t) => {
  t.mock.method(Product, 'findById', async () => ({ trackInventory: true }));
  t.mock.method(Product, 'findOneAndUpdate', async () => null);

  await assert.rejects(
    inventoryService.reserveStock('product-1', 4),
    /insufficient stock/i,
  );
});

test('releaseReservedStock cannot release more than the product has reserved', async (t) => {
  t.mock.method(Product, 'findById', async () => ({ trackInventory: true }));
  t.mock.method(Product, 'findOneAndUpdate', async () => null);

  await assert.rejects(
    inventoryService.releaseReservedStock('product-1', 2),
    /reserved stock/i,
  );
});

test('untracked products do not mutate stock during release', async (t) => {
  let mutationAttempted = false;
  t.mock.method(Product, 'findById', async () => ({ trackInventory: false }));
  t.mock.method(Product, 'findOneAndUpdate', async () => {
    mutationAttempted = true;
  });

  await inventoryService.releaseReservedStock('product-1', 2);
  assert.equal(mutationAttempted, false);
});

test('untracked products do not mutate stock during reservation', async (t) => {
  let mutationAttempted = false;
  t.mock.method(Product, 'findById', async () => ({
    trackInventory: false,
    stock: { available: 0, reserved: 0 },
  }));
  t.mock.method(Product, 'findOneAndUpdate', async () => {
    mutationAttempted = true;
  });

  const result = await inventoryService.reserveStock('product-1', 10);

  assert.equal(mutationAttempted, false);
  assert.equal(result.trackInventory, false);
});
