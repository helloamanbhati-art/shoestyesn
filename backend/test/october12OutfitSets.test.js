const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { october12OutfitSets } = require('../scripts/october-12-outfit-sets-catalog');

test('October 12 outfit catalog contains all 20 supplied photos as admin-editable products', () => {
  assert.equal(october12OutfitSets.length, 20);
  assert.equal(new Set(october12OutfitSets.map(({ sku }) => sku)).size, 20);
  assert.equal(new Set(october12OutfitSets.map(({ imageFile }) => imageFile)).size, 20);

  for (const product of october12OutfitSets) {
    assert.match(product.sku, /^GSH-OCT12-SET-\d{3}$/);
    assert.equal(product.categoryName, 'Outfit Sets');
    assert.equal(product.clothingType, 'Shirt & Pant Set');
    assert.deepEqual(product.availableSizes, ['S', 'M', 'L', 'XL', 'XXL']);
    assert.ok(product.compareAtPrice > product.price);
    assert.equal(
      fs.existsSync(path.resolve(__dirname, '../../catalog_import/october-12-outfit-sets', product.imageFile)),
      true,
      `Missing image: ${product.imageFile}`,
    );
  }
});

test('new colour-block shirt and jeans sets use the requested 799 selling price', () => {
  const newSets = october12OutfitSets.filter(({ sku }) => /^GSH-OCT12-SET-0(1[89]|20)$/.test(sku));

  assert.equal(newSets.length, 3);
  assert.ok(newSets.every(({ price, compareAtPrice }) => price === 799 && compareAtPrice === 899));
});

test('Bugs Bunny denim set is 899 and every other supplied outfit is 1099', () => {
  const discounted = october12OutfitSets.filter(({ price }) => price === 899);
  const regular = october12OutfitSets.filter(({ price }) => price === 1099);

  assert.equal(discounted.length, 1);
  assert.equal(discounted[0].sku, 'GSH-OCT12-SET-002');
  assert.equal(discounted[0].compareAtPrice, 999);
  assert.equal(regular.length, 16);
  assert.ok(regular.every(({ compareAtPrice }) => compareAtPrice === 1299));
});
