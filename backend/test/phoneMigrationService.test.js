const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPhoneMigrationPlan } = require('../src/services/phoneMigrationService');

test('legacy Indian phones normalize while duplicate identities are reported', () => {
  const plan = buildPhoneMigrationPlan([
    { _id: '1', phone: '9876543210' },
    { _id: '2', phone: '+91 98765 43210' },
    { _id: '3', phone: 'not-a-phone' },
    { _id: '4', phone: '9123456780' },
  ]);
  assert.equal(plan.conflicts.length, 1);
  assert.deepEqual(plan.conflicts[0].customerIds, ['1', '2']);
  assert.deepEqual(plan.invalid.map((item) => item.id), ['3']);
  assert.deepEqual(plan.updates.map((item) => item.id), ['4']);
  assert.equal(plan.updates[0].normalizedPhone, '+919123456780');
});
