const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { bootCatalog, bootSizes } = require('../scripts/october-27-boot-catalog');

test('boot catalog groups all eight supplied photos into three product galleries', () => {
  assert.equal(bootCatalog.length, 3);
  assert.deepEqual(bootSizes, ['3', '4', '5', '6', '7', '8']);
  assert.deepEqual(
    bootCatalog.map(({ sku, imageFiles }) => [sku, imageFiles.length]),
    [
      ['SHOE-OCT27-BOOT-001', 3],
      ['SHOE-OCT27-BOOT-002', 2],
      ['SHOE-OCT27-BOOT-003', 3],
    ],
  );

  const assetRoot = path.resolve(__dirname, '../../catalog_import/october-27-boots');
  const imageFiles = bootCatalog.flatMap((product) => product.imageFiles);
  assert.equal(new Set(imageFiles).size, 8);

  for (const product of bootCatalog) {
    assert.ok(product.name);
    assert.ok(product.shortDescription);
    assert.ok(product.price > 0);
    assert.equal(product.categoryName, 'Boots');
    assert.equal(product.clothingType, 'Ankle Boots');
    assert.deepEqual(product.availableSizes, bootSizes);
  }

  for (const imageFile of imageFiles) {
    assert.equal(fs.existsSync(path.join(assetRoot, imageFile)), true, `Missing image: ${imageFile}`);
  }
});

test('each boot gallery starts with a product-only catalog image', () => {
  assert.deepEqual(
    bootCatalog.map(({ imageFiles }) => imageFiles[0]),
    ['sparkle-side.png', 'crocodile-side.png', 'denim-side.png'],
  );
});
