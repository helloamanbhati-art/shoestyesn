export interface DeliveryPhoneField {
  label: 'Verified mobile' | 'Mobile number';
  readOnly: boolean;
  value: string;
}

export function getDeliveryPhoneField(customerPhone: string | null | undefined): DeliveryPhoneField {
  const value = customerPhone?.trim() || '';
  return {
    label: value ? 'Verified mobile' : 'Mobile number',
    readOnly: Boolean(value),
    value,
  };
}

export function normalizeDeliveryPhone(input: string): string {
  const compact = input.trim().replace(/[\s()-]/g, '');
  const normalized = /^\d{10}$/.test(compact)
    ? `+91${compact}`
    : /^91\d{10}$/.test(compact)
      ? `+${compact}`
      : compact;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Enter a valid mobile number, including the country code if outside India.');
  }

  return normalized;
}

export function isValidDeliveryPhone(input: string): boolean {
  try {
    normalizeDeliveryPhone(input);
    return true;
  } catch {
    return false;
  }
}
