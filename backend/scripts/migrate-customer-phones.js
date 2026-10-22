require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');
const { buildPhoneMigrationPlan } = require('../src/services/phoneMigrationService');

const redact = (phone) => {
  const value = String(phone || '');
  return value.length > 4 ? `${'*'.repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}` : '****';
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const customers = await Customer.collection.find({}, { projection: { phone: 1 } }).toArray();
  const plan = buildPhoneMigrationPlan(customers, process.env.LEGACY_PHONE_COUNTRY_CODE || '+91');
  const report = {
    mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    scanned: customers.length,
    updates: plan.updates.map((item) => ({ id: item.id, from: redact(item.currentPhone), to: redact(item.normalizedPhone) })),
    invalid: plan.invalid.map((item) => ({ id: item.id, phone: redact(item.currentPhone) })),
    conflicts: plan.conflicts.map((item) => ({ phone: redact(item.normalizedPhone), customerIds: item.customerIds })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (process.argv.includes('--apply')) {
    if (plan.invalid.length || plan.conflicts.length) {
      throw new Error('Resolve invalid and duplicate phone identities before applying the migration');
    }
    if (plan.updates.length) {
      await Customer.collection.bulkWrite(plan.updates.map((item) => ({
        updateOne: { filter: { _id: new mongoose.Types.ObjectId(item.id), phone: item.currentPhone }, update: { $set: { phone: item.normalizedPhone } } },
      })));
    }
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
