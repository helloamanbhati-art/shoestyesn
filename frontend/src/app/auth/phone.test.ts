import assert from 'node:assert/strict';
import test from 'node:test';

import { maskPhone, normalizePhoneInput } from './phone.ts';

test('normalizes a country calling code and removes common phone separators', () => {
  assert.deepEqual(normalizePhoneInput('91', '98765 43210'), {
    countryCode: '+91',
    phone: '9876543210',
  });

  assert.deepEqual(normalizePhoneInput('+1', '(415) 555-2671'), {
    countryCode: '+1',
    phone: '4155552671',
  });
});

test('rejects invalid or overlong international phone numbers', () => {
  assert.throws(() => normalizePhoneInput('+91', '98AB543210'));
  assert.throws(() => normalizePhoneInput('+123', '1234567890123'));
});

test('masks all but the last four phone digits', () => {
  assert.equal(maskPhone('+91 98765 43210'), '•••• 3210');
});
