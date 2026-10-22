const test = require('node:test');
const assert = require('node:assert/strict');

const Cart = require('../src/models/Cart');

test('cart requires a customer owner', async () => {
  const cart = new Cart({ items: [] });

  await assert.rejects(cart.validate(), /customer/i);
});

test('cart item quantity must be a positive whole number', async () => {
  const cart = new Cart({
    customer: '507f1f77bcf86cd799439011',
    items: [{
      product: '507f191e810c19729de860ea',
      variantId: 'default',
      quantity: 1.5,
    }],
  });

  await assert.rejects(cart.validate(), /quantity/i);
});
