const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./src/models/Order');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const orders = await Order.find({ 'items.productName': /cotton suit/i }).sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders for "cotton suit":`);
    for (let o of orders) {
      console.log(`Order: ${o.orderNumber} (Created: ${o.createdAt})`);
      for (let item of o.items) {
        if (item.productName.match(/cotton suit/i)) {
          console.log(`  Color requested: "${item.color}"`);
          console.log(`  productImage stored: "${item.productImage}"`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
