const test = require('node:test');
const assert = require('node:assert/strict');

const Order = require('../src/models/Order');
const {
  createGuestAccessToken,
  hashGuestAccessToken,
  canAccessOrder,
} = require('../src/services/guestOrderAccessService');

test('guest orders do not require a customer database account', () => {
  assert.equal(Boolean(Order.schema.path('customer').isRequired), false);
});

test('guest token hashes are never serialized in API order payloads', () => {
  const order = new Order({ guestAccessTokenHash: 'secret-hash' });
  assert.equal(order.toJSON().guestAccessTokenHash, undefined);
});

test('guest access uses a random token and stores only its hash', () => {
  const token = createGuestAccessToken();
  const hash = hashGuestAccessToken(token);

  assert.match(token, /^[A-Za-z0-9_-]{32,}$/);
  assert.notEqual(hash, token);
  assert.equal(canAccessOrder({ guestAccessTokenHash: hash }, null, token), true);
  assert.equal(canAccessOrder({ guestAccessTokenHash: hash }, null, `${token}x`), false);
});

test('signed-in customers can only access their own orders', () => {
  assert.equal(canAccessOrder({ customer: 'customer-a' }, { _id: 'customer-a' }), true);
  assert.equal(canAccessOrder({ customer: 'customer-a' }, { _id: 'customer-b' }), false);
});
