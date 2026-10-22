const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];

const products = [
  ['Emerald Quarter-Zip Top & White Pant Set', 1099],
  ['Indigo Quarter-Zip Top & White Pant Set', 1099],
  ['Navy Geometric Shirt & Black Pant Set', 899],
  ['Sage Hooded Quarter-Zip Top & Black Pant Set', 1099],
  ['Ivory Cutwork Shirt & Black Pant Set', 899],
  ['White & Blue Textured Shirt & Black Pant Set', 899],
  ['Chocolate Check Jacket & White Pant Set', 899],
  ['Dusty Rose Cutwork Shirt & Black Pant Set', 899],
  ['Blue Ombre Jacket & White Pant Set', 899],
  ['Red Tartan Jacket & White Pant Set', 899],
  ['Blue Graphic Top & Light-Wash Jeans Set', 899],
  ['White Disaster Graphic Top & Black Pant Set', 899],
  ['Sand Ombre Jacket & White Pant Set', 899],
  ['Blush Floral Shirt & White Pant Set', 1099],
  ['Charcoal Floral Shirt & White Pant Set', 1099],
  ['Black Cross Graphic Top & Light-Wash Jeans Set', 899],
  ['Mustard Floral Shirt & White Pant Set', 1099],
];

const october14OutfitSets = products.map(([name, price], index) => ({
  sku: `GSH-OCT14-SET-${String(index + 1).padStart(3, '0')}`,
  imageFile: `outfit-set-${String(index + 1).padStart(3, '0')}.jpeg`,
  name,
  price,
  compareAtPrice: price === 1099 ? 1299 : 1099,
  colors: ['As shown'],
  categoryName: 'Outfit Sets',
  clothingType: 'Top & Pant Set',
  availableSizes,
}));

module.exports = { availableSizes, october14OutfitSets };
