const shoeSizes = ['3', '4', '5', '6', '7', '8'];
const bannerImageFile = 'espresso-cuff-knee-boot-lifestyle-1.png';

const kneeBootCatalog = [
  {
    sku: 'SHOE-OCT27-ANKLE-004',
    name: 'Noir Gold-Toe Ankle Heel Boots',
    shortDescription: 'Sleek black ankle boots finished with a polished gold-tone cap toe',
    price: 1499,
    color: 'Black and Gold',
    clothingType: 'Ankle Boots',
    imageFiles: ['noir-gold-toe-ankle-boot.png'],
  },
  {
    sku: 'SHOE-OCT27-KNEE-005',
    name: 'Noir Wrinkle Patent Knee Boots',
    shortDescription: 'High-shine black knee boots with a softly wrinkled shaft and pointed stiletto profile',
    price: 1899,
    color: 'Patent Black',
    clothingType: 'Knee Boots',
    imageFiles: [
      'noir-wrinkle-knee-boot.png',
      'noir-wrinkle-knee-boot-lifestyle-1.png',
      'noir-wrinkle-knee-boot-lifestyle-2.png',
      'noir-wrinkle-knee-boot-lifestyle-3.png',
    ],
  },
  {
    sku: 'SHOE-OCT27-KNEE-006',
    name: 'Espresso Cuff Knee Boots',
    shortDescription: 'Chocolate pointed-toe boots wrapped in a textured ivory cuff with buckle trim',
    price: 1799,
    color: 'Ivory and Espresso',
    clothingType: 'Knee Boots',
    imageFiles: [
      'espresso-cuff-knee-boot.png',
      bannerImageFile,
      'espresso-cuff-knee-boot-lifestyle-2.png',
      'espresso-cuff-knee-boot-lifestyle-3.png',
    ],
  },
].map((product) => ({
  ...product,
  categoryName: 'Boots',
  availableSizes: shoeSizes,
}));

module.exports = { bannerImageFile, kneeBootCatalog, shoeSizes };
