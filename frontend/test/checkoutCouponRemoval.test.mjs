import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/Checkout.tsx', import.meta.url),
  'utf8',
);

test('storefront checkout does not expose or submit optional coupon and delivery notes', () => {
  assert.doesNotMatch(source, /couponCode|Coupon code/i);
  assert.doesNotMatch(source, /customerNotes|Delivery notes/i);
  assert.match(source, /quoteCheckout\(addressFrom\(form\)\)/);
  assert.doesNotMatch(source, /couponCode:\s*form\./);
});
