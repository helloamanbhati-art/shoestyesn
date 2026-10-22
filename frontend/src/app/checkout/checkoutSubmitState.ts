interface CheckoutSubmitStateInput {
  formComplete: boolean;
  quoteReady: boolean;
  isQuoting: boolean;
  isProcessing: boolean;
  isSyncing: boolean;
}

export function getCheckoutSubmitState(input: CheckoutSubmitStateInput) {
  if (input.isProcessing) {
    return { disabled: true, message: 'Creating your secure payment…' };
  }
  if (input.isSyncing) {
    return { disabled: true, message: 'Updating your cart…' };
  }
  if (input.isQuoting) {
    return { disabled: true, message: 'Verifying prices and availability…' };
  }
  if (!input.formComplete) {
    return { disabled: false, message: 'Complete all required delivery details to continue.' };
  }
  if (!input.quoteReady) {
    return { disabled: false, message: 'We could not verify this checkout. Tap the button to try again.' };
  }
  return { disabled: false, message: 'Prices and availability are verified by the server.' };
}
