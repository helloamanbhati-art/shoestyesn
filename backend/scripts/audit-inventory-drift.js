require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const legacy = await Inventory.find().lean();
  const products = await Product.find({ _id: { $in: legacy.map((item) => item.product) } })
    .select('name stock trackInventory')
    .lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const drift = legacy.flatMap((record) => {
    const product = byId.get(String(record.product));
    if (!product) return [{ productId: String(record.product), issue: 'ORPHANED_LEGACY_RECORD' }];
    const differences = ['available', 'reserved', 'damaged'].filter(
      (field) => Number(record[field] || 0) !== Number(product.stock?.[field] || 0),
    );
    return differences.length ? [{
      productId: String(product._id),
      name: product.name,
      fields: differences,
      authoritativeProductStock: product.stock,
      legacyInventory: {
        available: record.available,
        reserved: record.reserved,
        damaged: record.damaged,
      },
    }] : [];
  });
  console.log(JSON.stringify({ checked: legacy.length, driftCount: drift.length, drift }, null, 2));
  await mongoose.disconnect();
  if (drift.length) process.exitCode = 2;
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
