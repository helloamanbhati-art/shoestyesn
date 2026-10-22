const path = require('node:path');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Cart = require('../src/models/Cart');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');
const Review = require('../src/models/Review');

const applyChanges = process.argv.includes('--apply');

function cloudinaryAsset(url) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com/')) return null;
  const match = url.match(/\/(image|video|raw)\/upload\/(?:[^/]+\/)*(?:v\d+\/)?(.+)\.[^./?]+(?:\?.*)?$/i);
  if (!match) return null;
  return { resourceType: match[1].toLowerCase(), publicId: decodeURIComponent(match[2]) };
}

function productMedia(products) {
  const assets = new Map();
  for (const product of products) {
    const urls = [
      product.image,
      ...(product.images || []),
      ...(product.variants || []).flatMap((variant) => (variant.images || []).map((image) => image.imageUrl)),
    ];
    for (const url of urls) {
      const asset = cloudinaryAsset(url);
      if (asset) assets.set(`${asset.resourceType}:${asset.publicId}`, asset);
    }
  }
  return [...assets.values()];
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  const products = await Product.find({}).select('_id name image images variants').lean();
  const productIds = products.map(({ _id }) => _id);
  const assets = productMedia(products);
  const [inventoryCount, reviewCount, affectedCartCount] = await Promise.all([
    Inventory.countDocuments({ product: { $in: productIds } }),
    Review.countDocuments({ product: { $in: productIds } }),
    Cart.countDocuments({ 'items.product': { $in: productIds } }),
  ]);

  const summary = {
    mode: applyChanges ? 'apply' : 'dry-run',
    products: products.length,
    cloudinaryAssets: assets.length,
    inventoryRecords: inventoryCount,
    reviews: reviewCount,
    affectedCarts: affectedCartCount,
    productNames: products.map(({ name }) => name),
  };

  if (!applyChanges) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are required');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const cloudinaryResults = [];
  for (const asset of assets) {
    const result = await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      invalidate: true,
    });
    cloudinaryResults.push({ ...asset, result: result.result });
  }

  const [inventoryResult, reviewResult, cartResult, productResult] = await Promise.all([
    Inventory.deleteMany({ product: { $in: productIds } }),
    Review.deleteMany({ product: { $in: productIds } }),
    Cart.updateMany(
      { 'items.product': { $in: productIds } },
      { $pull: { items: { product: { $in: productIds } } } },
    ),
    Product.deleteMany({ _id: { $in: productIds } }),
  ]);

  console.log(JSON.stringify({
    ...summary,
    deletedProducts: productResult.deletedCount,
    deletedInventoryRecords: inventoryResult.deletedCount,
    deletedReviews: reviewResult.deletedCount,
    cleanedCarts: cartResult.modifiedCount,
    deletedCloudinaryAssets: cloudinaryResults.filter(({ result }) => result === 'ok').length,
    missingCloudinaryAssets: cloudinaryResults.filter(({ result }) => result === 'not found').length,
    unexpectedCloudinaryResults: cloudinaryResults.filter(({ result }) => !['ok', 'not found'].includes(result)),
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
