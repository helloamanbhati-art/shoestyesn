const crypto = require('crypto');

function createGuestAccessToken(seed) {
  if (!seed) return crypto.randomBytes(32).toString('base64url');
  const secret = process.env.GUEST_ORDER_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-guest-order-secret-change-me';
  return crypto.createHmac('sha256', secret).update(String(seed), 'utf8').digest('base64url');
}

function hashGuestAccessToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function canAccessOrder(order, customer, guestToken = '') {
  if (customer && order.customer) return String(order.customer._id || order.customer) === String(customer._id);
  if (!order.guestAccessTokenHash || !guestToken) return false;
  const actual = Buffer.from(hashGuestAccessToken(guestToken), 'hex');
  const expected = Buffer.from(order.guestAccessTokenHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { createGuestAccessToken, hashGuestAccessToken, canAccessOrder };
