const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { heelCatalog } = require('../scripts/october-22-heel-catalog');

test('shoe catalog contains all eight supplied products with complete card details', () => {
  assert.equal(heelCatalog.length, 8);
  assert.deepEqual(
    heelCatalog.map(({ imageFile }) => imageFile),
    [
      'red-patent-pump.png',
      'black-slingback-pump.png',
      'nude-classic-pump.png',
      'pink-patent-pump.png',
      'leopard-ankle-boot.png',
      'white-ankle-boot.png',
      'rose-gold-strap-sandal.png',
      'black-platform-sandal.png',
    ],
  );

  for (const product of heelCatalog) {
    assert.ok(product.name);
    assert.ok(product.shortDescription);
    assert.ok(product.price > 0);
    assert.ok(['Heels', 'Boots', 'Sandals'].includes(product.categoryName));
  }

  assert.deepEqual([...new Set(heelCatalog.map(({ categoryName }) => categoryName))], ['Heels', 'Boots', 'Sandals']);
});

test('compact storefront product responses include the card subtitle', () => {
  const source = readFileSync(path.resolve(__dirname, '../src/controllers/productController.js'), 'utf8');
  const cardFields = source.match(/const CARD_PRODUCT_FIELDS = \[([\s\S]*?)\]\.join/)?.[1] || '';
  assert.match(cardFields, /"shortDescription"/);
});
