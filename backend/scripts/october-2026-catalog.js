const topSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const categorySlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const rows = [
  ['Rust Cross Graphic Tee & Light-Wash Jeans Combo', 1200, 1599, 'Rust / Light Blue', 'Combo Packs'],
  ['Sky Cross Graphic Tee & White Jeans Combo', 1200, 1599, 'Sky Blue / White', 'Combo Packs'],
  ['Broken Heart Graphic Sweatshirt & White Jeans Combo', 1200, 1599, 'White / Red / Black', 'Combo Packs'],
  ['Black Allen Solly Sweatshirt & White Jeans Combo', 1200, 1599, 'Black / White', 'Combo Packs'],
  ['Sky Ombre Embroidered Shirt & White Jeans Combo', 1099, 1499, 'Sky Blue / White', 'Combo Packs'],
  ['Sage Ombre Embroidered Shirt & Charcoal Jeans Combo', 1099, 1499, 'Sage / Charcoal', 'Combo Packs'],
  ['Rust Abstract Overshirt & Stone Jeans Combo', 1099, 1499, 'Rust / Grey / Stone', 'Combo Packs'],
  ['Grey Paint-Splash Overshirt & Black Jeans Combo', 1099, 1499, 'Grey / Multi / Black', 'Combo Packs'],
  ['Charcoal Landscape Overshirt & Black Jeans Combo', 1099, 1499, 'Charcoal / Black', 'Combo Packs'],
  ['Sand Crane Graphic Tee & Relaxed Trouser Combo', 899, 1299, 'Sand', 'Combo Packs'],
  ['Black Crane Graphic Tee & Relaxed Trouser Combo', 899, 1299, 'Black', 'Combo Packs'],
  ['Black V Graphic Tee & Relaxed Trouser Combo', 899, 1299, 'Black / White', 'Combo Packs'],
  ['Navy Weird Original Tee & Black Trouser Combo', 899, 1299, 'Navy / Black', 'Combo Packs'],
  ['Forest Floral Applique Shirt', 399, 699, 'Forest Green / Cream', 'Shirts'],
  ['Cocoa Floral Applique Shirt', 399, 699, 'Cocoa / Cream', 'Shirts'],
  ['Lime Floral Applique Shirt', 399, 699, 'Lime / White', 'Shirts'],
  ['Ivory Floral Applique Shirt', 399, 699, 'Ivory / Brown', 'Shirts'],
  ['Sky Floral Applique Shirt', 399, 699, 'Sky Blue / Cream', 'Shirts'],
  ['Orange Floral Applique Shirt', 399, 699, 'Orange / Cream', 'Shirts'],
  ['Sage Garden Embroidered Shirt & White Jeans Combo', 899, 1299, 'Sage / White', 'Combo Packs'],
  ['Wine Folk-Art Shirt & White Jeans Combo', 899, 1299, 'Wine / White', 'Combo Packs'],
  ['Cream Heritage Shirt & Mocha Jeans Combo', 899, 1299, 'Cream / Mocha', 'Combo Packs'],
  ['Black Botanical Border Shirt & White Jeans Combo', 899, 1299, 'Black / White', 'Combo Packs'],
  ['Black Floral Panel Shirt & White Jeans Combo', 899, 1299, 'Black / White', 'Combo Packs'],
  ['White Black-Floral Shirt & Charcoal Jeans Combo', 899, 1299, 'White / Charcoal', 'Combo Packs'],
  ['White Earth Zip Shirt & Black Wide-Leg Jeans Combo', 1099, 1499, 'White / Black', 'Combo Packs'],
  ['Grey Earth Zip Shirt & Indigo Wide-Leg Jeans Combo', 1099, 1499, 'Grey / Indigo', 'Combo Packs'],
  ['Mustard Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Mustard / White', 'Combo Packs'],
  ['Black Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Black / Cream / White', 'Combo Packs'],
  ['Lilac Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Lilac / Cream / White', 'Combo Packs'],
  ['Black Earth Zip Shirt & Sky Wide-Leg Jeans Combo', 1099, 1499, 'Black / Sky Blue', 'Combo Packs'],
  ['Wine Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Wine / Cream / White', 'Combo Packs'],
  ['Purple Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Purple / Cream / White', 'Combo Packs'],
  ['Mint Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Mint / Cream / White', 'Combo Packs'],
  ['Pink Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Pink / Cream / White', 'Combo Packs'],
  ['Teal Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Teal / Cream / White', 'Combo Packs'],
  ['Orange Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Orange / Cream / White', 'Combo Packs'],
  ['Royal Blue Ombre Paisley Embellished Shirt & White Jeans Combo', 1099, 1499, 'Royal Blue / Cream / White', 'Combo Packs'],
];

// The follow-up WhatsApp delivery contains 136 additional coordinated looks.
// Keep their public names stable and tied to the photographed look number so a
// customer or admin can unambiguously identify the exact image being ordered.
// Two source creatives advertise a ₹550 combo; every other look uses the
// storefront's established ₹899 combo tier.
for (let lookNumber = 39; lookNumber <= 174; lookNumber += 1) {
  const advertisedAt550 = lookNumber === 123 || lookNumber === 128;
  rows.push([
    `Gujjus Style Look ${String(lookNumber).padStart(3, '0')} Combo`,
    advertisedAt550 ? 550 : 899,
    advertisedAt550 ? 899 : 1299,
    'As shown',
    'Combo Packs',
  ]);
}

const octoberCatalog = rows.map(([name, price, compareAtPrice, color, categoryName], index) => ({
  sku: `GSH-OCT10-${String(index + 1).padStart(3, '0')}`,
  imageFile: `product-${String(index + 1).padStart(3, '0')}.jpeg`,
  name,
  price,
  compareAtPrice,
  colors: [color],
  categoryName,
  clothingType: categoryName === 'Shirts' ? 'Shirt' : 'Coordinated Outfit',
  availableSizes: topSizes,
}));

module.exports = { categorySlug, octoberCatalog, topSizes };
