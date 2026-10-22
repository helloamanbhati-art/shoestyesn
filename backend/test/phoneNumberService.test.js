const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PhoneNumberError,
  normalizeToE164,
} = require("../src/services/phoneNumberService");

test("normalizes an Indian mobile number and calling code to E.164", () => {
  assert.equal(
    normalizeToE164({ phone: "98765 43210", countryCode: "+91" }),
    "+919876543210"
  );
});

test("normalizes formatted international numbers without creating a second identity", () => {
  assert.equal(
    normalizeToE164({ phone: "+44 7911 123456", countryCode: "+44" }),
    "+447911123456"
  );
});

test("rejects an international number that conflicts with the selected calling code", () => {
  assert.throws(
    () => normalizeToE164({ phone: "+91 98765 43210", countryCode: "+44" }),
    (error) =>
      error instanceof PhoneNumberError && error.code === "INVALID_PHONE_NUMBER"
  );
});

test("rejects numbers that are not valid mobile or fixed-line numbers", () => {
  assert.throws(
    () => normalizeToE164({ phone: "123", countryCode: "+91" }),
    PhoneNumberError
  );
});
