const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = readFileSync(
  join(__dirname, '../src/controllers/paymentController.js'),
  'utf8',
);

test('payment verification responds before sending the confirmation email', () => {
  const responseIndex = source.indexOf('res.json({', source.indexOf('exports.verifyPayment'));
  const emailIndex = source.indexOf('sendPaymentReceivedEmail', source.indexOf('exports.verifyPayment'));

  assert.notEqual(responseIndex, -1);
  assert.notEqual(emailIndex, -1);
  assert.ok(responseIndex < emailIndex, 'email delivery must not delay the verified response');
  assert.doesNotMatch(source, /await emailService\.sendPaymentReceivedEmail/);
});
