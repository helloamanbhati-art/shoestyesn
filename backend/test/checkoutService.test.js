const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CheckoutError,
  buildOrderItems,
  getShippingCost,
} = require('../src/services/checkoutService');

function product(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    name: 'Kurta',
    image: '/kurta.jpg',
    price: 1000,
    compareAtPrice: 200,
    additionalChargeAmount: 50,
    additionalChargeName: 'Stitching',
    soldBy: 'piece',
    isActive: true,
    inStock: true,
    trackInventory: true,
    stock: { available: 3 },
    availableSizes: ['M'],
    variants: [],
    ...overrides,
  };
}

test('shipping is temporarily free for payment testing', () => {
  assert.equal(getShippingCost('Rajasthan'), 0);
  assert.equal(getShippingCost('Gujarat'), 0);
});

test('order items are priced from populated products, not client input', () => {
  const items = buildOrderItems([{
    product: product(),
    quantity: 2,
    selectedSize: 'M',
    selectedColor: null,
    variantId: 'default',
  }]);
  assert.equal(items[0].price, 1000);
  assert.equal(items[0].subtotal, 2100);
  assert.equal(items[0].total, 2100);
});

test('checkout rejects a cart quantity that is no longer available', () => {
  assert.throws(() => buildOrderItems([{
    product: product({ stock: { available: 1 } }),
    quantity: 2,
    selectedSize: 'M',
    variantId: 'default',
  }]), (error) => error instanceof CheckoutError && error.code === 'INSUFFICIENT_STOCK');
});
