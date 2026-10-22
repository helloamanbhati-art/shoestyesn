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

function setOrDelete(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
