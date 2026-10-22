const shirtSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const jeansSizes = ['28', '30', '32', '34', '36'];

const shirtNames = [
  'Chocolate Brown Embroidered Casual Shirt',
  'Classic White Embroidered Casual Shirt',
  'Charcoal Double-Pocket Overshirt',
  'White Windowpane Check Shirt',
  'Teal Windowpane Check Shirt',
  'Black & White Plaid Overshirt',
  'Stone Grey Double-Pocket Overshirt',
  'Indigo Denim Double-Pocket Shirt',
  'Classic Black Embroidered Shirt',
  'Premium Black Embroidered Casual Shirt',
  'Black Double-Pocket Overshirt',
  'Midnight Black Pocket Shirt',
  'Black Utility Double-Pocket Overshirt',
  'Ivory Sky Ombre Utility Shirt',
  'Black Snap-Button Overshirt',
  'Cloud Grey Denim Utility Shirt',
  'Washed Black Utility Shirt',
  'Jet Black Layering Shirt',
  'Black Gold Embroidered Shirt',
  'Black Mandarin-Collar Layering Shirt',
  'Midnight Black Premium Shirt',
  'Crisp White Utility Shirt',
  'Black Everyday Pocket Shirt',
  'Black Hooded Casual Shirt',
  'White & Sky Polo Embroidered Shirt',
  'Stone & Black Polo Embroidered Shirt',
  'Black Polo Embroidered Shirt',
  'Lemon & Sky Polo Embroidered Shirt',
  'White Polo Embroidered Shirt',
];

const jeansNames = [
  'Charcoal Multi-Pocket Cargo Jeans',
  'Black Faded Wide-Leg Jeans',
  'Vintage Blue Balloon-Fit Jeans',
  'Washed Black Extra-Wide Jeans',
  'Black Carpenter Wide-Leg Jeans',
  'Vintage Grey Wide-Leg Jeans',
  'Washed Black Wide-Leg Jeans',
  'Dark Grey Relaxed Wide-Leg Jeans',
  'Distressed Star Patch Cargo Jeans',
  'Black Phoenix Graphic Jeans',
  'Vintage Black Baggy Jeans',
  'Jet Black Relaxed Jeans',
  'Light Blue Balloon-Fit Jeans',
  'Charcoal Faded Wide-Leg Jeans',
];

const shirtRows = shirtNames.map((name, index) => ({
  sku: `GSH-OCT12-SHR-${String(index + 1).padStart(3, '0')}`,
  imageFile: `apparel-${String(index < 24 ? index + 1 : index + 15).padStart(3, '0')}.jpeg`,
  name,
  price: index < 24 ? 350 : 399,
  compareAtPrice: index < 24 ? 399 : 499,
  colors: ['As shown'],
  categoryName: 'Shirts',
  clothingType: 'Shirt',
  availableSizes: shirtSizes,
}));

const jeansRows = jeansNames.map((name, index) => ({
  sku: `GSH-OCT12-JNS-${String(index + 1).padStart(3, '0')}`,
  imageFile: `apparel-${String(index + 25).padStart(3, '0')}.jpeg`,
  name,
  price: 699,
  compareAtPrice: 799,
  colors: ['As shown'],
  categoryName: 'Jeans',
  clothingType: 'Jeans',
  availableSizes: jeansSizes,
}));

const october12Catalog = [...shirtRows, ...jeansRows];

module.exports = { jeansSizes, october12Catalog, shirtSizes };
