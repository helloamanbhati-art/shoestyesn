const path = require('node:path');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');
const { bootCatalog } = require('./october-27-boot-catalog');

const imageRoot = path.resolve(__dirname, '../../catalog_import/october-27-boots');
const applyChanges = process.argv.includes('--apply');

async function uploadGallery(product) {
  const images = [];
  for (const [index, imageFile] of product.imageFiles.entries()) {
    const upload = await cloudinary.uploader.upload(path.join(imageRoot, imageFile), {
      public_id: `shoe-style/products/${product.sku.toLowerCase()}-${index + 1}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    images.push({ imageUrl: upload.secure_url, isPrimary: index === 0, sortOrder: index });
  }
  return images;
}

async function run() {
  if (!applyChanges) {
    console.log(JSON.stringify({ mode: 'dry-run', total: bootCatalog.length, products: bootCatalog }, null, 2));
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
    { name: 'Shoe Style' },
    { $set: { description: 'Modern statement footwear for every occasion.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const category = await Category.findOneAndUpdate(
    { name: 'Boots' },
    { $set: { slug: 'boots', description: 'Statement ankle boots with pointed toes and block heels.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  let created = 0;
  let updated = 0;
  for (const productData of bootCatalog) {
    const images = await uploadGallery(productData);
    let product = await Product.findOne({ sku: productData.sku });
    const isNew = !product;
    if (!product) product = new Product({ sku: productData.sku });

    product.set({
      name: productData.name,
      description: `${productData.shortDescription}. Finished in ${productData.color}. Select your size before adding it to the cart.`,
      shortDescription: productData.shortDescription,
      price: productData.price,
      soldBy: 'piece',
      clothingType: productData.clothingType,
      availableSizes: productData.availableSizes,
      outfitComponents: [],
      brand: brand._id,
      category: category._id,
      colors: [productData.color],
      variants: [{
        variantId: `${productData.sku.toLowerCase()}-1`,
        variantName: productData.color,
        images,
      }],
      tags: ['boots', 'ankle boots', 'block heels', 'women shoes', productData.color.toLowerCase()],
      stock: { available: 20, reserved: 0, damaged: 0, lowStockThreshold: 5 },
      inStock: true,
      trackInventory: true,
      isActive: true,
      isFeatured: true,
    });
    await product.save();
    await Inventory.findOneAndUpdate(
      { product: product._id },
      { $set: { available: 20, reserved: 0, lowStockThreshold: 5 } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    if (isNew) created += 1;
    else updated += 1;
  }

  console.log(JSON.stringify({ mode: 'apply', created, updated, total: bootCatalog.length }, null, 2));
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => mongoose.disconnect());
}

module.exports = { run, uploadGallery };
