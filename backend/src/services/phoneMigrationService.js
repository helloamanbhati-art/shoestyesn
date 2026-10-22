const { parsePhoneNumberFromString } = require('libphonenumber-js/max');
const { normalizeToE164 } = require('./phoneNumberService');

function normalizeLegacyPhone(phone, defaultCountryCode = '+91') {
  const value = String(phone || '').trim();
  if (value.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(value);
    if (!parsed?.isValid() || !/^\+[1-9]\d{7,14}$/.test(parsed.number)) {
      throw new Error('Invalid international phone');
    }
    return parsed.number;
  }
  return normalizeToE164({ phone: value, countryCode: defaultCountryCode });
}

function buildPhoneMigrationPlan(customers, defaultCountryCode = '+91') {
  const valid = [];
  const invalid = [];
  const byPhone = new Map();

  for (const customer of customers) {
    try {
      const normalizedPhone = normalizeLegacyPhone(customer.phone, defaultCountryCode);
      const entry = { id: String(customer._id), currentPhone: customer.phone, normalizedPhone };
      valid.push(entry);
      byPhone.set(normalizedPhone, [...(byPhone.get(normalizedPhone) || []), entry]);
    } catch {
      invalid.push({ id: String(customer._id), currentPhone: customer.phone });
    }
  }
  const conflicts = [...byPhone.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([normalizedPhone, entries]) => ({ normalizedPhone, customerIds: entries.map((entry) => entry.id) }));
  const conflictedIds = new Set(conflicts.flatMap((conflict) => conflict.customerIds));
  const updates = valid.filter((entry) => !conflictedIds.has(entry.id) && entry.currentPhone !== entry.normalizedPhone);
  return { updates, invalid, conflicts };
}

module.exports = { buildPhoneMigrationPlan, normalizeLegacyPhone };
