const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { october14OutfitSets } = require('../scripts/october-14-outfit-sets-catalog');

test('October 14 outfit catalog contains all 17 supplied photos with storefront-ready data', () => {
  assert.equal(october14OutfitSets.length, 17);
  assert.equal(new Set(october14OutfitSets.map(({ sku }) => sku)).size, 17);
  assert.equal(new Set(october14OutfitSets.map(({ imageFile }) => imageFile)).size, 17);

  for (const product of october14OutfitSets) {
    assert.match(product.sku, /^GSH-OCT14-SET-\d{3}$/);
    assert.equal(product.categoryName, 'Outfit Sets');
    assert.equal(product.clothingType, 'Top & Pant Set');
    assert.deepEqual(product.availableSizes, ['S', 'M', 'L', 'XL', 'XXL']);
    assert.ok(product.compareAtPrice > product.price);
    assert.equal(
      fs.existsSync(path.resolve(__dirname, '../../catalog_import/october-14-outfit-sets', product.imageFile)),
      true,
      `Missing image: ${product.imageFile}`,
    );
  }
});

test('October 14 outfit prices match the two price groups supplied by the customer', () => {
  const premium = october14OutfitSets.filter(({ price }) => price === 1099);
  const standard = october14OutfitSets.filter(({ price }) => price === 899);

  assert.equal(premium.length, 6);
  assert.equal(standard.length, 11);
  assert.ok(premium.every(({ compareAtPrice }) => compareAtPrice === 1299));
  assert.ok(standard.every(({ compareAtPrice }) => compareAtPrice === 1099));
});
