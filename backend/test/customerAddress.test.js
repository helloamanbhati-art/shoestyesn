const assert = require('node:assert/strict');
const test = require('node:test');

const Customer = require('../src/models/Customer');

test('new checkout addresses receive a MongoDB ObjectId without manual construction', () => {
  const customer = new Customer({ phone: '+919876543210' });

  customer.addresses.push({
    type: 'home',
    fullName: 'Test Customer',
    phone: '+919876543210',
    addressLine1: '1 Test Road',
    city: 'Surat',
    state: 'Gujarat',
    zipCode: '395007',
    country: 'India',
  });

  assert.ok(customer.addresses[0]._id);
  assert.equal(customer.addresses[0]._id.constructor.name, 'ObjectId');
});
