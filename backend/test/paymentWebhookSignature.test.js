const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { verifyRazorpayWebhookSignature } = require('../src/services/paymentService');
const paymentService = require('../src/services/paymentService');
const PaymentTransaction = require('../src/models/PaymentTransaction');

test('Razorpay webhook signatures are checked against the unmodified raw body', () => {
  const secret = 'webhook-test-secret';
  const rawBody = Buffer.from('{"event":"order.paid","payload":{"id":"evt_1"}}');
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyRazorpayWebhookSignature(rawBody, signature, secret), true);
  assert.equal(
    verifyRazorpayWebhookSignature(Buffer.from(`${rawBody.toString()} `), signature, secret),
    false,
  );
  assert.equal(verifyRazorpayWebhookSignature(rawBody, 'bad-signature', secret), false);
});

test('mock payment verification is disabled in production', async () => {
  const previousMode = process.env.RAZORPAY_MOCK_MODE;
  const previousEnvironment = process.env.NODE_ENV;
  const previousKey = process.env.RAZORPAY_KEY_ID;
  try {
    process.env.RAZORPAY_MOCK_MODE = 'true';
    process.env.NODE_ENV = 'production';
    delete process.env.RAZORPAY_KEY_ID;
    await assert.rejects(() => paymentService.verifyPayment({
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'signature',
    }), (error) => error.code === 'PAYMENT_GATEWAY_UNAVAILABLE' && error.statusCode === 503);
  } finally {
    if (previousMode === undefined) delete process.env.RAZORPAY_MOCK_MODE; else process.env.RAZORPAY_MOCK_MODE = previousMode;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment;
    if (previousKey === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previousKey;
  }
});

test('forged browser payment signatures are rejected as a safe client error', async () => {
  const previousMode = process.env.RAZORPAY_MOCK_MODE;
  const previousEnvironment = process.env.NODE_ENV;
  const previousKey = process.env.RAZORPAY_KEY_ID;
  const previousSecret = process.env.RAZORPAY_KEY_SECRET;
  try {
    process.env.RAZORPAY_MOCK_MODE = 'false';
    process.env.NODE_ENV = 'development';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    await assert.rejects(() => paymentService.verifyPayment({
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_forged',
      razorpay_signature: 'forged_signature',
    }), (error) => (
      error.code === 'PAYMENT_SIGNATURE_INVALID'
      && error.statusCode === 400
      && !error.message.includes('test-secret')
    ));
  } finally {
    if (previousMode === undefined) delete process.env.RAZORPAY_MOCK_MODE; else process.env.RAZORPAY_MOCK_MODE = previousMode;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment;
    if (previousKey === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previousKey;
    if (previousSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previousSecret;
  }
});

test('Razorpay transaction identifiers are unique when present', () => {
  const indexes = PaymentTransaction.schema.indexes();
  const paymentId = indexes.find(([keys]) => keys.razorpayPaymentId === 1);
  const transactionId = indexes.find(([keys]) => keys.transactionId === 1);
  assert.equal(paymentId?.[1]?.unique, true);
  assert.equal(transactionId?.[1]?.unique, true);
});
