import test from 'node:test';
import assert from 'node:assert/strict';

import { getCheckoutSubmitState } from '../src/app/checkout/checkoutSubmitState.ts';

test('incomplete delivery details do not leave the payment button disabled without explanation', () => {
  const state = getCheckoutSubmitState({
    formComplete: false,
    quoteReady: false,
    isQuoting: false,
    isProcessing: false,
    isSyncing: false,
  });

  assert.equal(state.disabled, false);
  assert.match(state.message, /complete.*delivery details/i);
});

test('a failed or missing quote remains retryable and explains the problem', () => {
  const state = getCheckoutSubmitState({
    formComplete: true,
    quoteReady: false,
    isQuoting: false,
    isProcessing: false,
    isSyncing: false,
  });

  assert.equal(state.disabled, false);
  assert.match(state.message, /could not verify/i);
});

test('payment is temporarily disabled only during active quote, cart, or order work', () => {
  for (const busy of ['isQuoting', 'isProcessing', 'isSyncing'] as const) {
    const state = getCheckoutSubmitState({
      formComplete: true,
      quoteReady: true,
      isQuoting: false,
      isProcessing: false,
      isSyncing: false,
      [busy]: true,
    });
    assert.equal(state.disabled, true);
  }
});
