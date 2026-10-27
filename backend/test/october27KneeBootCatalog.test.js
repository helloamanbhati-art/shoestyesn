const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { bannerImageFile, kneeBootCatalog, shoeSizes } = require('../scripts/october-27-knee-boot-catalog');

test('the supplied nine images are grouped into three complete product galleries', () => {
  assert.equal(kneeBootCatalog.length, 3);
  assert.deepEqual(shoeSizes, ['3', '4', '5', '6', '7', '8']);
  assert.deepEqual(
    kneeBootCatalog.map(({ sku, imageFiles }) => [sku, imageFiles.length]),
    [
      ['SHOE-OCT27-ANKLE-004', 1],
      ['SHOE-OCT27-KNEE-005', 4],
      ['SHOE-OCT27-KNEE-006', 4],
    ],
  );

  const assetRoot = path.resolve(__dirname, '../../catalog_import/october-27-knee-boots');
  const imageFiles = kneeBootCatalog.flatMap((product) => product.imageFiles);
  assert.equal(new Set(imageFiles).size, 9);
  assert.ok(imageFiles.includes(bannerImageFile));

  for (const product of kneeBootCatalog) {
    assert.ok(product.name);
    assert.ok(product.shortDescription);
    assert.ok(product.price > 0);
    assert.equal(product.categoryName, 'Boots');
    assert.deepEqual(product.availableSizes, shoeSizes);
  }

  for (const imageFile of imageFiles) {
    assert.equal(fs.existsSync(path.join(assetRoot, imageFile)), true, `Missing image: ${imageFile}`);
  }
});

test('catalog images lead each gallery and the beige lifestyle shot is selected for the banner', () => {
  assert.deepEqual(
    kneeBootCatalog.map(({ imageFiles }) => imageFiles[0]),
    ['noir-gold-toe-ankle-boot.png', 'noir-wrinkle-knee-boot.png', 'espresso-cuff-knee-boot.png'],
  );
  assert.equal(bannerImageFile, 'espresso-cuff-knee-boot-lifestyle-1.png');
});

test('the importer publishes the lifestyle image as the storefront banner', () => {
  const importer = fs.readFileSync(
    path.resolve(__dirname, '../scripts/import-october-27-knee-boots.js'),
    'utf8',
  );
  assert.match(importer, /AppSettings\.findOneAndUpdate/);
  assert.match(importer, /bannerUrl: uploadedImages\.get\(bannerImageFile\)/);
});
