const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addCartItemSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  updateCartItemSchema,
} = require('../src/validation/cartValidation');

test('add cart item accepts only a database product id and bounded quantity', () => {
  assert.equal(addCartItemSchema.validate({
    productId: '507f1f77bcf86cd799439011',
    selectedSize: '38',
    quantity: 2,
  }).error, undefined);

  assert.match(
    addCartItemSchema.validate({ productId: 'not-an-id', quantity: 1 }).error.message,
    /length|hexadecimal/i,
  );
  assert.match(
    addCartItemSchema.validate({
      productId: '507f1f77bcf86cd799439011',
      quantity: 101,
    }).error.message,
    /less than or equal to 100/i,
  );
});

test('update cart item rejects zero quantity', () => {
  assert.match(updateCartItemSchema.validate({ quantity: 0 }).error.message, /greater than or equal to 1/i);
});

test('cart item route parameters reject invalid ids before reaching MongoDB', () => {
  assert.equal(cartItemParamsSchema.validate({
    itemId: '507f1f77bcf86cd799439011',
  }).error, undefined);
  assert.ok(cartItemParamsSchema.validate({ itemId: 'bad-id' }).error);
});

test('cart input accepts only four or five meter packages', () => {
  const productId = '507f1f77bcf86cd799439011';
  assert.equal(addCartItemSchema.validate({ productId, meters: 4 }).error, undefined);
  assert.equal(addCartItemSchema.validate({ productId, meters: 5 }).error, undefined);
  assert.ok(addCartItemSchema.validate({ productId, meters: 4.5 }).error);
});

test('cart merge accepts at most fifty local selections', () => {
  const productId = '507f1f77bcf86cd799439011';
  const items = Array.from({ length: 51 }, () => ({ productId, quantity: 1 }));
  assert.ok(mergeCartSchema.validate({ items }).error);
});
