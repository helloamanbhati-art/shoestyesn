import assert from 'node:assert/strict';
import test from 'node:test';

import { getDeliveryPhoneField, normalizeDeliveryPhone } from './deliveryPhone.ts';

test('allows a delivery number when the customer has no verified mobile', () => {
  assert.deepEqual(getDeliveryPhoneField(null), {
    label: 'Mobile number',
    readOnly: false,
    value: '',
  });
});

test('keeps an existing verified customer mobile locked', () => {
  assert.deepEqual(getDeliveryPhoneField('+919876543210'), {
    label: 'Verified mobile',
    readOnly: true,
    value: '+919876543210',
  });
});

test('normalizes Indian delivery numbers to the backend E.164 contract', () => {
  assert.equal(normalizeDeliveryPhone('98765 43210'), '+919876543210');
  assert.equal(normalizeDeliveryPhone('+91 98765-43210'), '+919876543210');
});
