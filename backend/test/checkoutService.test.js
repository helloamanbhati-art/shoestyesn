const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CheckoutError,
  buildOrderItems,
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

test('checkout rejects quantity above the selected size inventory', () => {
  assert.throws(() => buildOrderItems([{
    product: product({ stock: { available: 5 }, sizeStock: [{ size: 'M', available: 1 }] }),
    quantity: 2,
    selectedSize: 'M',
    variantId: 'default',
  }]), (error) => error instanceof CheckoutError && error.code === 'INSUFFICIENT_SIZE_STOCK');
});

test('checkout validates size quantity against the selected variant', () => {
  const variants = [
    { variantId: 'black', variantName: 'Black', sizeStock: [{ size: 'M', available: 0 }] },
    { variantId: 'red', variantName: 'Red', sizeStock: [{ size: 'M', available: 2 }] },
  ];
  assert.throws(() => buildOrderItems([{
    product: product({ variants, stock: { available: 2 } }),
    quantity: 1,
    selectedSize: 'M',
    variantId: 'black',
  }]), (error) => error instanceof CheckoutError && error.code === 'INSUFFICIENT_SIZE_STOCK');
  const [item] = buildOrderItems([{
    product: product({ variants, stock: { available: 2 } }),
    quantity: 2,
    selectedSize: 'M',
    variantId: 'red',
  }]);
  assert.equal(item.selectedVariant.variantId, 'red');
});
