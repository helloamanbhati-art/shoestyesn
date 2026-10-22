const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Product = require('../src/models/Product');
const Inventory = require('../src/models/Inventory');

const API_BASE_URL = process.env.IMPORT_API_URL || 'http://localhost:3000';
const IMAGE_DIR = path.resolve(__dirname, '../../catalog_final');

const combos = [
  ['Cobalt Varsity Denim Combo', 'Jersey & Denim', 1299, 1799],
  ['Monochrome Portrait Denim Combo', 'Graphic Tee & Denim', 1199, 1699],
  ['Burgundy Collegiate Denim Combo', 'Raglan & Denim', 1249, 1749],
  ['Forest Polo Charcoal Combo', 'Polo & Trousers', 1099, 1499],
  ['Red Hoodie Cargo Combo', 'Hoodie & Cargo', 1599, 2199],
  ['Sky Check Layered Combo', 'Overshirt & Trousers', 1399, 1899],
  ['Lime Street Shorts Combo', 'Tee & Shorts', 999, 1399],
  ['Botanical Resort Combo', 'Resort Shirt & Trousers', 1499, 1999],
  ['Vintage Brown Denim Combo', 'Sweatshirt & Denim', 1499, 2049],
  ['Monochrome Stripe Denim Combo', 'Knitwear & Denim', 1399, 1899],
];

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${payload.message || response.statusText}`);
  return payload;
}

async function login() {
  const payload = await requestJson(`${API_BASE_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  return payload.token;
}

async function uploadImages(token) {
  const form = new FormData();
  for (let index = 1; index <= combos.length; index += 1) {
    const fileName = `combo-${String(index).padStart(2, '0')}.png`;
    const bytes = fs.readFileSync(path.join(IMAGE_DIR, fileName));
    form.append('images', new Blob([bytes], { type: 'image/png' }), fileName);
  }
  const payload = await requestJson(`${API_BASE_URL}/api/v1/admin/products/upload-images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return payload.urls;
}

async function removeExistingProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await Product.deleteMany({});
  await Inventory.deleteMany({});
  await mongoose.disconnect();
  return result.deletedCount;
}

async function run() {
  const token = await login();
  const urls = await uploadImages(token);
  if (urls.length !== combos.length) throw new Error(`Expected 10 uploaded images, received ${urls.length}`);

  const removed = await removeExistingProducts();
  let created = 0;

  for (let index = 0; index < combos.length; index += 1) {
    const [name, clothingType, price, compareAtPrice] = combos[index];
    const imageUrl = urls[index];
    await requestJson(`${API_BASE_URL}/api/v1/admin/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: `${name} by Khodyaar Creation. A complete coordinated streetwear look with a relaxed unisex fit.`,
        brand: 'Khodyaar Creation',
        category: 'Combo Sets',
        price,
        compareAtPrice,
        soldBy: 'piece',
        clothingType,
        availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
        inStock: true,
        isActive: true,
        variants: [{
          variantId: `combo-${String(index + 1).padStart(2, '0')}`,
          variantName: 'As shown',
          images: [{ imageUrl, isPrimary: true, sortOrder: 0 }],
        }],
      }),
    });
    created += 1;
  }

  console.log(JSON.stringify({ removed, created, imageUrls: urls }, null, 2));
}

run().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exitCode = 1;
});
