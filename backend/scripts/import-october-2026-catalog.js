const path = require('node:path');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');
const { categorySlug, octoberCatalog } = require('./october-2026-catalog');

const imageRoot = path.resolve(__dirname, '../../catalog_import/october-2026');
const applyChanges = process.argv.includes('--apply');

function outfitComponents(product) {
  if (product.categoryName === 'Shirts') return [];
  return [
    { componentId: `${product.sku.toLowerCase()}-top`, name: 'Top', availableSizes: product.availableSizes },
    { componentId: `${product.sku.toLowerCase()}-bottom`, name: 'Bottom', availableSizes: ['28', '30', '32', '34', '36', '38'] },
  ];
}

async function run() {
  if (!applyChanges) {
    console.log(JSON.stringify({ mode: 'dry-run', total: octoberCatalog.length, skus: octoberCatalog.map(({ sku }) => sku) }, null, 2));
    return;
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are required');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  await mongoose.connect(process.env.MONGODB_URI);

  const brand = await Brand.findOneAndUpdate(
    { name: 'GUJJUS STYLE HUB' },
    { $set: { description: 'Contemporary coordinated outfits and statement shirts.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const categories = {};
  for (const name of [...new Set(octoberCatalog.map(({ categoryName }) => categoryName))]) {
    categories[name] = await Category.findOneAndUpdate(
      { name },
      { $set: {
        slug: categorySlug(name),
        description: name === 'Shirts' ? 'Statement shirts and embroidered tops.' : 'Ready-to-style coordinated clothing combinations.',
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  let created = 0;
  let updated = 0;
  for (const productData of octoberCatalog) {
    const uploadedImage = await cloudinary.uploader.upload(path.join(imageRoot, productData.imageFile), {
      public_id: `gujjus-style-hub/products/${productData.sku.toLowerCase()}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    let product = await Product.findOne({ sku: productData.sku });
    const isNew = !product;
    if (!product) product = new Product({ sku: productData.sku });
    const components = outfitComponents(productData);

    product.set({
      name: productData.name,
      description: `${productData.name} from GUJJUS STYLE HUB in the colour shown. ${components.length ? 'Choose a size for each included piece.' : 'Choose your preferred shirt size.'}`,
      shortDescription: components.length ? 'Coordinated outfit combo' : 'Statement long-sleeve shirt',
      price: productData.price,
      compareAtPrice: productData.compareAtPrice,
      soldBy: 'piece',
      clothingType: productData.clothingType,
      availableSizes: components.length ? [] : productData.availableSizes,
      outfitComponents: components,
      brand: brand._id,
      category: categories[productData.categoryName]._id,
      colors: productData.colors,
      variants: [{
        variantId: `${productData.sku.toLowerCase()}-1`,
        variantName: productData.colors[0],
        images: [{ imageUrl: uploadedImage.secure_url, isPrimary: true, sortOrder: 0 }],
      }],
      tags: components.length ? ['combo outfit', 'co-ord set', 'new arrival'] : ['shirt', 'embroidered shirt', 'new arrival'],
      stock: { available: 25, reserved: 0, damaged: 0, lowStockThreshold: 5 },
      inStock: true,
      trackInventory: true,
      isActive: true,
      isFeatured: true,
    });
    await product.save();
    await Inventory.findOneAndUpdate(
      { product: product._id },
      { $set: { available: 25, reserved: 0, lowStockThreshold: 5 } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    if (isNew) created += 1;
    else updated += 1;
  }

  console.log(JSON.stringify({ mode: 'apply', created, updated, total: octoberCatalog.length }, null, 2));
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { outfitComponents, run };
