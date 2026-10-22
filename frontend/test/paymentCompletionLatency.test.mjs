import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/Payment.tsx', import.meta.url),
  'utf8',
);

test('verified payments navigate without a duplicate order fetch or cart refresh wait', () => {
  const handlerStart = source.indexOf('const handleVerifiedPayment');
  const handlerEnd = source.indexOf('const openPayment', handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);

  assert.doesNotMatch(handler, /await getOrder/);
  assert.doesNotMatch(source, /await refreshCart\(\)/);
  assert.match(handler, /await verifyPayment/);
  assert.match(handler, /finish\(\{/);
});

test('closing Razorpay immediately restores the payment action without blocking polling', () => {
  const dismissStart = source.indexOf('ondismiss:');
  const dismissEnd = source.indexOf('},', dismissStart);
  const dismissHandler = source.slice(dismissStart, dismissEnd);

  assert.match(dismissHandler, /setIsProcessing\(false\)/);
  assert.match(dismissHandler, /setIsConfirming\(false\)/);
  assert.match(dismissHandler, /setIsPolling\(false\)/);
  assert.doesNotMatch(dismissHandler, /poll\(/);
  assert.doesNotMatch(dismissHandler, /setIsPolling\(true\)/);
});
