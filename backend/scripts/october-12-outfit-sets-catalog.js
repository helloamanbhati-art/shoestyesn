const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];

const outfitNames = [
  'Sky Ombre Shirt & Ivory Pant Set',
  'Bugs Bunny Denim Shirt & Ivory Pant Set',
  'Chocolate Check Shirt & White Pant Set',
  'Navy Stripe Shirt & White Pant Set',
  'Red Graphic Shirt & Ivory Pant Set',
  'Maroon Stripe Shirt & White Pant Set',
  'Navy Bird Embroidered Shirt & Black Pant Set',
  'Maroon Check Shirt & White Pant Set',
  'Sky Blue Bird Embroidered Shirt & Black Pant Set',
  'Tan Bird Embroidered Shirt & Black Pant Set',
  'White Bird Embroidered Shirt & Black Pant Set',
  'Red Krishna Embroidered Shirt & Peacock Pant Set',
  'Maroon Krishna Embroidered Shirt & Peacock Pant Set',
  'Grey Krishna Embroidered Shirt & Peacock Pant Set',
  'Navy Krishna Embroidered Shirt & Peacock Pant Set',
  'White Krishna Embroidered Shirt & Peacock Pant Set',
  'Black Krishna Embroidered Shirt & Peacock Pant Set',
  'Orange Colour-Block Shirt & Blue Jeans Set',
  'Mint Colour-Block Shirt & Blue Jeans Set',
  'Stone Colour-Block Shirt & Blue Jeans Set',
];

const october12OutfitSets = outfitNames.map((name, index) => {
  const isBugsBunnySet = index === 1;
  const isColourBlockSet = index >= 17;

  return {
    sku: `GSH-OCT12-SET-${String(index + 1).padStart(3, '0')}`,
    imageFile: `outfit-set-${String(index + 1).padStart(3, '0')}.jpeg`,
    name,
    price: isColourBlockSet ? 799 : (isBugsBunnySet ? 899 : 1099),
    compareAtPrice: isColourBlockSet ? 899 : (isBugsBunnySet ? 999 : 1299),
    colors: ['As shown'],
    categoryName: 'Outfit Sets',
    clothingType: 'Shirt & Pant Set',
    availableSizes,
  };
});

module.exports = { availableSizes, october12OutfitSets };
