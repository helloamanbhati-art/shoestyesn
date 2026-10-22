const test = require("node:test");
const assert = require("node:assert/strict");

const Customer = require("../src/models/Customer");

test("a phone-only customer is valid with one normalized mobile identity", async () => {
  const customer = new Customer({ phone: "+919876543210", isVerified: true });

  await customer.validate();

  assert.equal(customer.phone, "+919876543210");
  assert.equal(customer.email, undefined);
  assert.equal(customer.password, undefined);
});

test("customer phone identity has a unique database index", () => {
  const phoneIndex = Customer.schema
    .indexes()
    .find(([keys]) => keys.phone === 1);

  assert.ok(phoneIndex);
  assert.equal(phoneIndex[1].unique, true);
});

test("customer model rejects a non-E.164 phone identity", async () => {
  const customer = new Customer({ phone: "9876543210" });

  await assert.rejects(() => customer.validate(), /E\.164/);
});
