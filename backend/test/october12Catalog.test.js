const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { october12Catalog } = require('../scripts/october-12-apparel-catalog');

test('October 12 apparel catalog contains all 43 supplied photos with unique identifiers', () => {
  assert.equal(october12Catalog.length, 43);
  assert.equal(new Set(october12Catalog.map(({ sku }) => sku)).size, 43);
  assert.equal(new Set(october12Catalog.map(({ imageFile }) => imageFile)).size, 43);

  for (const product of october12Catalog) {
    assert.match(product.sku, /^GSH-OCT12-(SHR|JNS)-\d{3}$/);
    assert.ok(product.name.length > 5);
    assert.ok(product.compareAtPrice > product.price);
    assert.ok(product.availableSizes.length > 0);
    assert.equal(
      fs.existsSync(path.resolve(__dirname, '../../catalog_import/october-12-apparel', product.imageFile)),
      true,
      `Missing image: ${product.imageFile}`,
    );
  }
});

test('new embroidered shirts use the requested 399 selling price', () => {
  const newShirts = october12Catalog.filter(({ sku }) => /^GSH-OCT12-SHR-0(2[5-9])$/.test(sku));

  assert.equal(newShirts.length, 5);
  assert.ok(newShirts.every(({ price, compareAtPrice }) => price === 399 && compareAtPrice === 499));
});

test('shirts use 399 MRP and 350 sale price while jeans use 799 MRP and 699 sale price', () => {
  const shirts = october12Catalog.filter(({ sku }) => /^GSH-OCT12-SHR-0(0[1-9]|1\d|2[0-4])$/.test(sku));
  const jeans = october12Catalog.filter(({ categoryName }) => categoryName === 'Jeans');

  assert.equal(shirts.length, 24);
  assert.equal(jeans.length, 14);
  assert.ok(shirts.every(({ price, compareAtPrice }) => price === 350 && compareAtPrice === 399));
  assert.ok(jeans.every(({ price, compareAtPrice }) => price === 699 && compareAtPrice === 799));
});
