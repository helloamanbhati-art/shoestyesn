const path = require('node:path');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');
const { october12OutfitSets } = require('./october-12-outfit-sets-catalog');

const imageRoot = path.resolve(__dirname, '../../catalog_import/october-12-outfit-sets');
const applyChanges = process.argv.includes('--apply');

async function run() {
  if (!applyChanges) {
    console.log(JSON.stringify({ mode: 'dry-run', total: october12OutfitSets.length, products: october12OutfitSets }, null, 2));
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
    { $set: { description: 'Affordable statement fashion and contemporary essentials.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const category = await Category.findOneAndUpdate(
    { name: 'Outfit Sets' },
    { $set: { slug: 'outfit-sets', description: 'Complete shirt and pant outfit sets from GUJJUS STYLE HUB.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  let created = 0;
  let updated = 0;
  for (const productData of october12OutfitSets) {
    const uploadedImage = await cloudinary.uploader.upload(path.join(imageRoot, productData.imageFile), {
      public_id: `gujjus-style-hub/products/${productData.sku.toLowerCase()}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    let product = await Product.findOne({ sku: productData.sku });
    const isNew = !product;
    if (!product) product = new Product({ sku: productData.sku });

    product.set({
      name: productData.name,
      description: `${productData.name} from GUJJUS STYLE HUB. This complete outfit includes the shirt and pant shown in the product photo. Select your size before adding it to the cart.`,
      shortDescription: 'Men\'s shirt and pant outfit set',
      price: productData.price,
      compareAtPrice: productData.compareAtPrice,
      soldBy: 'piece',
      clothingType: productData.clothingType,
      availableSizes: productData.availableSizes,
      outfitComponents: [
        { componentId: 'shirt', name: 'Shirt', availableSizes: productData.availableSizes },
        { componentId: 'pant', name: 'Pant', availableSizes: productData.availableSizes },
      ],
      brand: brand._id,
      category: category._id,
      colors: productData.colors,
      variants: [{
        variantId: `${productData.sku.toLowerCase()}-1`,
        variantName: productData.colors[0],
        images: [{ imageUrl: uploadedImage.secure_url, isPrimary: true, sortOrder: 0 }],
      }],
      tags: ['outfit set', 'shirt', 'pant', 'combo', 'new arrival'],
      stock: { available: 25, reserved: 0, damaged: 0, lowStockThreshold: 5 },
      inStock: true,
      trackInventory: true,
      isActive: true,
      isFeatured: true,
      isOnSale: true,
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

  console.log(JSON.stringify({ mode: 'apply', created, updated, total: october12OutfitSets.length }, null, 2));
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => mongoose.disconnect());
}

module.exports = { run };
