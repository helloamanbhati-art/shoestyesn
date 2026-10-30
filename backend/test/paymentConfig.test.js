const test = require('node:test');
const assert = require('node:assert/strict');

const paymentService = require('../src/services/paymentService');
const { AppError } = require('../src/middleware/errorHandler');

test('public payment config exposes only the Razorpay key id', () => {
  const previousKeyId = process.env.RAZORPAY_KEY_ID;
  const previousSecret = process.env.RAZORPAY_KEY_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousMockMode = process.env.RAZORPAY_MOCK_MODE;

  process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
  process.env.RAZORPAY_KEY_SECRET = 'must-never-leave-the-server';
  process.env.NODE_ENV = 'development';
  process.env.RAZORPAY_MOCK_MODE = 'false';

  try {
    assert.deepEqual(paymentService.getPublicPaymentConfig(), {
      keyId: 'rzp_test_public',
      mockMode: false,
    });
    assert.equal(JSON.stringify(paymentService.getPublicPaymentConfig()).includes('must-never-leave-the-server'), false);
  } finally {
    setOrDelete('RAZORPAY_KEY_ID', previousKeyId);
    setOrDelete('RAZORPAY_KEY_SECRET', previousSecret);
    setOrDelete('NODE_ENV', previousNodeEnv);
    setOrDelete('RAZORPAY_MOCK_MODE', previousMockMode);
  }
});

test('public payment config never enables mock mode in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousMockMode = process.env.RAZORPAY_MOCK_MODE;

  process.env.NODE_ENV = 'production';
  process.env.RAZORPAY_MOCK_MODE = 'true';

  try {
    assert.equal(paymentService.getPublicPaymentConfig().mockMode, false);
  } finally {
    setOrDelete('NODE_ENV', previousNodeEnv);
    setOrDelete('RAZORPAY_MOCK_MODE', previousMockMode);
  }
});

test('operational payment errors expose a stable safe contract', () => {
  const error = new AppError(
    'Secure payment is temporarily unavailable. Your cart is safe; please try again shortly.',
    503,
    'PAYMENT_GATEWAY_UNAVAILABLE',
  );

  assert.equal(error.statusCode, 503);
  assert.equal(error.code, 'PAYMENT_GATEWAY_UNAVAILABLE');
  assert.equal(error.isOperational, true);
  assert.equal(error.message.includes('Authentication failed'), false);
});

test('Razorpay configuration accepts test keys only outside production', () => {
  assert.deepEqual(paymentService.validateRazorpayConfiguration({
    nodeEnv: 'development',
    keyId: 'rzp_test_public',
    keySecret: 'server-secret',
    mockMode: 'false',
  }), { mode: 'test', configured: true, mockMode: false });

  assert.throws(() => paymentService.validateRazorpayConfiguration({
    nodeEnv: 'development',
    keyId: 'rzp_live_public',
    keySecret: 'server-secret',
    mockMode: 'false',
  }), /live Razorpay keys are not allowed outside production/i);
});

test('Razorpay configuration rejects test keys and mock mode in production', () => {
  assert.throws(() => paymentService.validateRazorpayConfiguration({
    nodeEnv: 'production',
    keyId: 'rzp_test_public',
    keySecret: 'server-secret',
    mockMode: 'false',
  }), /test Razorpay keys are not allowed in production/i);

  assert.throws(() => paymentService.validateRazorpayConfiguration({
    nodeEnv: 'production',
    keyId: 'rzp_live_public',
    keySecret: 'server-secret',
    mockMode: 'true',
  }), /mock mode is not allowed in production/i);
});

test('Razorpay configuration requires both halves of the API credential pair', () => {
  assert.throws(() => paymentService.validateRazorpayConfiguration({
    nodeEnv: 'development',
    keyId: 'rzp_test_public',
    keySecret: '',
    mockMode: 'false',
  }), /key id and key secret must both be configured/i);
});

test('verified payments must be captured and match order, amount, and currency', () => {
  assert.doesNotThrow(() => paymentService.assertVerifiedPaymentReady({
    order_id: 'order_1',
    amount: 12500,
    currency: 'INR',
    status: 'captured',
    captured: true,
  }, { orderId: 'order_1', amountPaise: 12500 }));

  for (const payment of [
    { order_id: 'order_other', amount: 12500, currency: 'INR', status: 'captured', captured: true },
    { order_id: 'order_1', amount: 12499, currency: 'INR', status: 'captured', captured: true },
    { order_id: 'order_1', amount: 12500, currency: 'USD', status: 'captured', captured: true },
    { order_id: 'order_1', amount: 12500, currency: 'INR', status: 'authorized', captured: false },
  ]) {
    assert.throws(
      () => paymentService.assertVerifiedPaymentReady(payment, { orderId: 'order_1', amountPaise: 12500 }),
      (error) => error instanceof AppError && [400, 409].includes(error.statusCode),
    );
  }
});

function setOrDelete(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
