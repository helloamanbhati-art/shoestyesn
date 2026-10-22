const path = require('path');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');
const ProductOptions = require('../src/models/ProductOptions');

const image = (number) => `/catalog/gujjus/product-${String(number).padStart(2, '0')}.jpeg`;
const imageFile = (number) => path.resolve(__dirname, `../../frontend/public${image(number)}`);
const topSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const waistSizes = ['28', '30', '32', '34', '36', '38'];
const shoeSizes = ['6', '7', '8', '9', '10'];

const products = [
  ['Olive Rugby Shirt & Black Denim Set', 1199, 'Olive / Washed Black', 'Rugby Shirt', 'Wide-Leg Jeans'],
  ['Riches Graphic Shirt, Black Denim & Sneakers Set', 1599, 'White / Washed Black', 'Graphic Shirt', 'Distressed Jeans', 'Sneakers'],
  ['Sky Denim Pullover & Black Jeans Set', 1199, 'Sky Blue / Washed Black', 'Denim Pullover', 'Wide-Leg Jeans'],
  ['Chocolate Polo & Sky Denim Set', 1099, 'Chocolate / Sky Blue', 'Polo Shirt', 'Wide-Leg Jeans'],
  ['Red Botanical Kurta & White Trouser Set', 1299, 'Ivory / Red / White', 'Printed Kurta', 'Trousers'],
  ['Burgundy Abstract Shirt & Brown Trouser Set', 1199, 'Ivory / Burgundy / Brown', 'Printed Shirt', 'Trousers'],
  ['Cocoa Crane Shirt & White Trouser Set', 1199, 'Cocoa / White', 'Embroidered Shirt', 'Trousers'],
  ['Wine Heritage Embroidered Shirt & White Trouser Set', 1299, 'Wine / White', 'Embroidered Shirt', 'Trousers'],
  ['White Lace-Up Hoodie & Black Denim Set', 1199, 'White / Black', 'Lace-Up Hoodie', 'Wide-Leg Jeans'],
  ['Acid-Wash Floral Jacket, Sky Denim & Sneakers Set', 1599, 'Brown / Sky Blue / Multi', 'Graphic Jacket', 'Wide-Leg Jeans', 'Sneakers'],
  ['Charcoal Don’t Stop Sweatshirt & Black Denim Set', 1099, 'Charcoal / Black', 'Graphic Sweatshirt', 'Wide-Leg Jeans'],
  ['Sky Hooded Denim Shirt & White Jeans Set', 1199, 'Sky Blue / White', 'Hooded Denim Shirt', 'Jeans'],
  ['Ivory Don’t Stop Sweatshirt & Brown Denim Set', 1099, 'Ivory / Brown', 'Graphic Sweatshirt', 'Wide-Leg Jeans'],
  ['Shadow Anime Check Shirt & Black Denim Set', 1099, 'Black / Mustard / Washed Black', 'Graphic Check Shirt', 'Wide-Leg Jeans'],
  ['Flay World Blue Check Shirt & Black Denim Set', 1099, 'Sky Blue / White / Black', 'Graphic Check Shirt', 'Wide-Leg Jeans'],
  ['Shadow Anime Wine Check Shirt & Black Denim Set', 1099, 'Wine / Ivory / Black', 'Graphic Check Shirt', 'Wide-Leg Jeans'],
  ['Spider Green Check Shirt & Black Denim Set', 1099, 'Green / White / Black', 'Graphic Check Shirt', 'Wide-Leg Jeans'],
  ['Maroon Heritage Kurta & White Trouser Set', 1299, 'Maroon / White', 'Embroidered Kurta', 'Trousers'],
  ['Sky Ombre Shirt, White Tee & Ivory Trouser Set', 1299, 'Sky Blue / White / Ivory', 'Ombre Shirt', 'Trousers'],
  ['Navy Abstract Shirt & Ivory Trouser Set', 1199, 'Navy / Ivory', 'Printed Shirt', 'Trousers'],
  ['Monochrome Wave Shirt & Ivory Trouser Set', 1199, 'Black / White / Ivory', 'Printed Shirt', 'Trousers'],
  ['Indigo Utility Denim Shirt & Ivory Trouser Set', 1299, 'Indigo / White / Ivory', 'Denim Overshirt', 'Trousers'],
  ['Midnight Garba Embroidered Shirt & Denim Set', 1299, 'Black / Multi', 'Embroidered Shirt', 'Jeans'],
  ['White Garba Embroidered Shirt & Denim Set', 1299, 'White / Multi', 'Embroidered Shirt', 'Jeans'],
  ['Sand Garba Embroidered Shirt & Denim Set', 1299, 'Sand / Multi', 'Embroidered Shirt', 'Jeans'],
];

const makeComponents = (sku, topName, bottomName, shoeName) => [
  { componentId: `${sku.toLowerCase()}-top`, name: topName, availableSizes: topSizes },
  { componentId: `${sku.toLowerCase()}-bottom`, name: bottomName, availableSizes: waistSizes },
  ...(shoeName ? [{ componentId: `${sku.toLowerCase()}-shoes`, name: shoeName, availableSizes: shoeSizes }] : []),
];

async function run() {
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
    { $set: { description: 'Contemporary coordinated menswear, streetwear, and festive outfit sets.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const category = await Category.findOneAndUpdate(
    { name: 'Combo Packs' },
    { $set: { description: 'Ready-to-style coordinated clothing combinations.' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await ProductOptions.findOneAndUpdate(
    { key: 'default' },
    { $set: { sizes: [...topSizes, ...waistSizes, ...shoeSizes], clothingTypes: ['Shirt & Trousers', 'Shirt & Jeans', 'Outfit with Shoes'] } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  let created = 0;
  let updated = 0;

  for (const [index, entry] of products.entries()) {
    const [name, price, colour, topName, bottomName, shoeName] = entry;
    const sku = `GSH-${String(index + 1).padStart(3, '0')}`;
    const withShoes = Boolean(shoeName);
    const uploadedImage = await cloudinary.uploader.upload(imageFile(index + 1), {
      public_id: `gujjus-style-hub/products/${sku.toLowerCase()}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    let product = await Product.findOne({ sku });
    const isNew = !product;
    if (!product) product = new Product({ sku });

    product.set({
      name,
      description: `${name} from GUJJUS STYLE HUB. Includes ${topName}, ${bottomName}${withShoes ? `, and ${shoeName}` : ''} in the colours shown. Choose a size for every included piece for a coordinated ready-to-wear look.`,
      shortDescription: `${topName}, ${bottomName}${withShoes ? ` & ${shoeName}` : ''} combo`,
      price,
      compareAtPrice: withShoes ? 1999 : 1599,
      soldBy: 'piece',
      clothingType: withShoes ? 'Outfit with Shoes' : `${topName} & ${bottomName}`,
      availableSizes: [],
      outfitComponents: makeComponents(sku, topName, bottomName, shoeName),
      brand: brand._id,
      category: category._id,
      colors: [colour],
      variants: [{
        variantId: `${sku.toLowerCase()}-1`,
        variantName: colour,
        images: [{ imageUrl: uploadedImage.secure_url, isPrimary: true, sortOrder: 0 }],
      }],
      tags: ['menswear', 'co-ord set', 'combo outfit', withShoes ? 'shoes combo' : 'shirt pant combo'],
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

  console.log(JSON.stringify({ created, updated, total: products.length }, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
