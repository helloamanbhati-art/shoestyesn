const { parsePhoneNumberFromString } = require("libphonenumber-js/max");

class PhoneNumberError extends Error {
  constructor(message = "Enter a valid international mobile number") {
    super(message);
    this.name = "PhoneNumberError";
    this.code = "INVALID_PHONE_NUMBER";
  }
}

function normalizeCallingCode(countryCode) {
  const compact = String(countryCode || "").replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{0,2}$/.test(compact)) {
    throw new PhoneNumberError("Enter a valid country calling code");
  }
  return compact;
}

function normalizeToE164({ phone, countryCode }) {
  const callingCode = normalizeCallingCode(countryCode);
  const rawPhone = String(phone || "").trim();

  if (!rawPhone || !/^[+\d\s().-]+$/.test(rawPhone)) {
    throw new PhoneNumberError();
  }

  const compactPhone = rawPhone.replace(/[\s().-]/g, "");
  const candidate = compactPhone.startsWith("+")
    ? compactPhone
    : `${callingCode}${compactPhone}`;
  const parsed = parsePhoneNumberFromString(candidate);

  if (
    !parsed ||
    !parsed.isValid() ||
    `+${parsed.countryCallingCode}` !== callingCode ||
    !/^\+[1-9]\d{7,14}$/.test(parsed.number)
  ) {
    throw new PhoneNumberError();
  }

  return parsed.number;
}

module.exports = {
  PhoneNumberError,
  normalizeCallingCode,
  normalizeToE164,
};
