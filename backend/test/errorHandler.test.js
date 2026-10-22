const test = require('node:test');
const assert = require('node:assert/strict');

const { AppError, errorHandler } = require('../src/middleware/errorHandler');

function capture(error) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  errorHandler(error, { url: '/checkout', method: 'POST' }, response, () => {});
  return response;
}

test('operational errors use the structured public error contract', () => {
  const response = capture(new AppError(
    'Secure payment is temporarily unavailable.',
    503,
    'PAYMENT_GATEWAY_UNAVAILABLE',
  ));

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: 'PAYMENT_GATEWAY_UNAVAILABLE',
      message: 'Secure payment is temporarily unavailable.',
    },
  });
});

test('unexpected errors never expose provider details or stack traces', () => {
  const response = capture(new Error('Authentication failed for secret key'));

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  });
  assert.equal(JSON.stringify(response.body).includes('secret key'), false);
  assert.equal('stack' in response.body, false);
});
