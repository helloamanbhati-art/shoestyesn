const path = require('node:path');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');
const { heelCatalog } = require('./october-22-heel-catalog');

const imageRoot = path.resolve(__dirname, '../../catalog_import/october-22-heels');
const applyChanges = process.argv.includes('--apply');
const categoryDescriptions = {
  Heels: 'Pointed-toe pumps, slingbacks, and stiletto heels.',
  Boots: 'Statement ankle boots with pointed toes and block heels.',
  Sandals: 'Ankle-strap, stiletto, and platform sandal styles.',
};

const categorySlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function run() {
  if (!applyChanges) {
    console.log(JSON.stringify({ mode: 'dry-run', total: heelCatalog.length, products: heelCatalog }, null, 2));
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
  const categories = new Map();
  for (const name of new Set(heelCatalog.map(({ categoryName }) => categoryName))) {
    const category = await Category.findOneAndUpdate(
      { name },
      { $set: { slug: categorySlug(name), description: categoryDescriptions[name] } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    categories.set(name, category);
  }

  let created = 0;
  let updated = 0;
  for (const productData of heelCatalog) {
    const upload = await cloudinary.uploader.upload(path.join(imageRoot, productData.imageFile), {
      public_id: `shoe-style/products/${productData.sku.toLowerCase()}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    let product = await Product.findOne({ sku: productData.sku });
    const isNew = !product;
    if (!product) product = new Product({ sku: productData.sku });

    product.set({
      name: productData.name,
      description: `${productData.shortDescription}. Available in ${productData.color}. Select your size before adding it to the cart.`,
      shortDescription: productData.shortDescription,
      price: productData.price,
      soldBy: 'piece',
      clothingType: productData.clothingType,
      availableSizes: productData.availableSizes,
      outfitComponents: [],
      brand: brand._id,
      category: categories.get(productData.categoryName)._id,
      colors: [productData.color],
      variants: [{
        variantId: `${productData.sku.toLowerCase()}-1`,
        variantName: productData.color,
        images: [{ imageUrl: upload.secure_url, isPrimary: true, sortOrder: 0 }],
      }],
      tags: [productData.categoryName.toLowerCase(), productData.clothingType.toLowerCase(), 'women shoes', productData.color.toLowerCase()],
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

  const usedCategoryIds = await Product.distinct('category');
  const emptyCategoryResult = await Category.deleteMany({ _id: { $nin: usedCategoryIds } });

  console.log(JSON.stringify({
    mode: 'apply',
    created,
    updated,
    total: heelCatalog.length,
    removedEmptyCategories: emptyCategoryResult.deletedCount,
  }, null, 2));
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
