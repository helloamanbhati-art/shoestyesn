const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { sneakerCatalog } = require('../scripts/october-11-sneaker-catalog');

test('sneaker catalog contains every supplied photo with unique identifiers', () => {
  assert.equal(sneakerCatalog.length, 33);
  assert.equal(new Set(sneakerCatalog.map(({ sku }) => sku)).size, 33);
  assert.equal(new Set(sneakerCatalog.map(({ imageFile }) => imageFile)).size, 33);

  for (const product of sneakerCatalog) {
    assert.match(product.sku, /^GSH-OCT11-SNK-\d{3}$/);
    assert.ok(product.name.length > 5);
    assert.ok([599, 699, 800, 1099].includes(product.price));
    assert.ok(product.compareAtPrice > product.price);
    assert.deepEqual(product.availableSizes, ['6', '7', '8', '9', '10']);
    assert.equal(
      fs.existsSync(path.resolve(__dirname, '../../catalog_import/october-11-sneakers', product.imageFile)),
      true,
      `Missing image: ${product.imageFile}`,
    );
  }
});

test('sneaker catalog uses all four requested price tiers', () => {
  assert.deepEqual(
    [...new Set(sneakerCatalog.map(({ price }) => price))].sort((a, b) => a - b),
    [599, 699, 800, 1099],
  );
});
