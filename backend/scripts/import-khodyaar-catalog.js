const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = process.env.IMPORT_API_URL || 'http://localhost:3000';
const IMAGE_DIR = path.resolve(__dirname, '../../catalog_import/images');
const BRAND = 'Khodyaar Creation';

const categoryByIndex = (index) => {
  const position = index % 60;
  if (position < 12) return ['Co-ord Sets', 'Graphic Tees'][position % 2];
  if (position < 24) return ['Shirts', 'Overshirts'][position % 2];
  if (position < 36) return ['Polos', 'Jerseys'][position % 2];
  if (position < 48) return ['Hoodies', 'Sweatshirts'][position % 2];
  return ['Streetwear Sets', 'Denim Looks'][position % 2];
};

const namesByCategory = {
  'Co-ord Sets': ['Urban Layer Co-ord', 'Weekend Denim Set', 'Contrast Street Set'],
  'Graphic Tees': ['Statement Graphic Tee', 'Oversized Art Tee', 'Washed Print Tee'],
  Shirts: ['Relaxed Resort Shirt', 'Textured Short-Sleeve Shirt', 'Everyday Camp Shirt'],
  Overshirts: ['Check Layer Overshirt', 'Monochrome Print Overshirt', 'Utility Layer Shirt'],
  Polos: ['Contrast Collar Polo', 'Minimal Crest Polo', 'Textured Knit Polo'],
  Jerseys: ['Varsity Number Jersey', 'Chicago Street Jersey', 'Athletic Mesh Jersey'],
  Hoodies: ['Graphic Street Hoodie', 'Washed Pullover Hoodie', 'Contrast Print Hoodie'],
  Sweatshirts: ['Relaxed Graphic Sweatshirt', 'Campus Crew Sweatshirt', 'Vintage Wash Crew'],
  'Streetwear Sets': ['Downtown Two-Piece Set', 'Street Club Set', 'Relaxed Graphic Set'],
  'Denim Looks': ['Denim Pairing Look', 'Relaxed Blue Denim Set', 'Everyday Denim Edit'],
};

function buildCatalog(imageUrls) {
  return imageUrls.map((imageUrl, index) => {
    const category = categoryByIndex(index);
    const baseName = namesByCategory[category][index % namesByCategory[category].length];
    const number = String(index + 1).padStart(3, '0');
    const price = 499 + ((index * 73) % 1100);
    return {
      name: `${baseName} ${number}`,
      description: `Khodyaar Creation ${category.toLowerCase()} style selected from the latest youth streetwear collection. Comfortable regular fit for everyday wear.`,
      brand: BRAND,
      category,
      price,
      compareAtPrice: Math.ceil((price * 1.35) / 50) * 50,
      soldBy: 'piece',
      clothingType: category,
      availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
      inStock: true,
      isActive: true,
      variants: [{
        variantId: `khodyaar-${number}`,
        variantName: 'As shown',
        images: [{ imageUrl, isPrimary: true, sortOrder: 0 }],
      }],
    };
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.message || response.statusText}`);
  }
  return payload;
}

async function login() {
  const payload = await requestJson(`${API_BASE_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  return payload.token;
}

async function uploadBatch(files, token) {
  const form = new FormData();
  files.forEach((filePath) => {
    const bytes = fs.readFileSync(filePath);
    form.append('images', new Blob([bytes], { type: 'image/jpeg' }), path.basename(filePath));
  });
  const payload = await requestJson(`${API_BASE_URL}/api/v1/admin/products/upload-images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return payload.urls;
}

async function run() {
  const files = fs.readdirSync(IMAGE_DIR)
    .filter((name) => name.endsWith('.jpg'))
    .sort()
    .map((name) => path.join(IMAGE_DIR, name));

  if (files.length === 0) throw new Error(`No catalog images found in ${IMAGE_DIR}`);

  const token = await login();
  const existingPayload = await requestJson(`${API_BASE_URL}/api/v1/products?limit=500`);
  const existingNames = new Set((existingPayload.data || []).map((product) => product.name));
  const imageUrls = [];

  for (let index = 0; index < files.length; index += 20) {
    const batch = files.slice(index, index + 20);
    const urls = await uploadBatch(batch, token);
    imageUrls.push(...urls);
    console.log(`Uploaded ${Math.min(index + batch.length, files.length)}/${files.length} images`);
  }

  const products = buildCatalog(imageUrls);
  let created = 0;
  let skipped = 0;

  for (const product of products) {
    if (existingNames.has(product.name)) {
      skipped += 1;
      continue;
    }
    await requestJson(`${API_BASE_URL}/api/v1/admin/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    created += 1;
    if (created % 20 === 0 || created === products.length) {
      console.log(`Created ${created}/${products.length} products`);
    }
  }

  console.log(JSON.stringify({ created, skipped, total: products.length }));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
