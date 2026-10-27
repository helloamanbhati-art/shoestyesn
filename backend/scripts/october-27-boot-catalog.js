const bootSizes = ['3', '4', '5', '6', '7', '8'];

const bootCatalog = [
  {
    sku: 'SHOE-OCT27-BOOT-001',
    name: 'Midnight Sparkle Block-Heel Boots',
    shortDescription: 'Black crystal-studded ankle boots with a confident block heel',
    price: 1599,
    color: 'Crystal Black',
    imageFiles: ['sparkle-side.png', 'sparkle-front-back.png', 'sparkle-lifestyle.png'],
  },
  {
    sku: 'SHOE-OCT27-BOOT-002',
    name: 'Monochrome Croc Block-Heel Boots',
    shortDescription: 'Pointed ankle boots in a striking black-and-white crocodile texture',
    price: 1699,
    color: 'Monochrome Croc',
    imageFiles: ['crocodile-side.png', 'crocodile-lifestyle.png'],
  },
  {
    sku: 'SHOE-OCT27-BOOT-003',
    name: 'Cloud Wash Denim Block-Heel Boots',
    shortDescription: 'Light-wash denim ankle boots with a softly pointed toe',
    price: 1499,
    color: 'Light Wash Denim',
    imageFiles: ['denim-side.png', 'denim-front-back.png', 'denim-lifestyle.png'],
  },
].map((product) => ({
  ...product,
  categoryName: 'Boots',
  clothingType: 'Ankle Boots',
  availableSizes: bootSizes,
}));

module.exports = { bootCatalog, bootSizes };
