export interface NormalizedPhoneInput {
  countryCode: string;
  phone: string;
}

const COUNTRY_CODE_PATTERN = /^\+?[1-9]\d{0,2}$/;
const PHONE_SEPARATOR_PATTERN = /[\s()-]/g;

export function normalizePhoneInput(countryCodeInput: string, phoneInput: string): NormalizedPhoneInput {
  const compactCountryCode = countryCodeInput.trim().replace(/\s/g, '');

  if (!COUNTRY_CODE_PATTERN.test(compactCountryCode)) {
    throw new Error('Enter a valid country calling code, such as +91.');
  }

  const countryCode = compactCountryCode.startsWith('+')
    ? compactCountryCode
    : `+${compactCountryCode}`;
  const phone = phoneInput.trim().replace(PHONE_SEPARATOR_PATTERN, '');

  if (!/^\d+$/.test(phone)) {
    throw new Error('Enter a mobile number using digits only.');
  }

  const internationalDigitCount = countryCode.length - 1 + phone.length;
  if (phone.length < 4 || internationalDigitCount < 7 || internationalDigitCount > 15) {
    throw new Error('Enter a valid mobile number for the selected country code.');
  }

  return { countryCode, phone };
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : digits;
}
