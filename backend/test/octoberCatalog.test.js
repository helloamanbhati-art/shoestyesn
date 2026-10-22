const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { categorySlug, octoberCatalog } = require('../scripts/october-2026-catalog');

test('October catalog contains every shared product image with unique identifiers', () => {
  assert.equal(octoberCatalog.length, 174);
  assert.equal(new Set(octoberCatalog.map((product) => product.sku)).size, 174);
  assert.equal(new Set(octoberCatalog.map((product) => product.imageFile)).size, 174);

  for (const product of octoberCatalog) {
    assert.match(product.sku, /^GSH-OCT10-\d{3}$/);
    assert.ok(product.name.length > 5);
    assert.ok(product.price > 0);
    assert.ok(product.compareAtPrice >= product.price);
    assert.ok(product.colors.length > 0);
    assert.ok(product.availableSizes.length > 0);
    assert.equal(
      fs.existsSync(path.resolve(__dirname, '../../catalog_import/october-2026', product.imageFile)),
      true,
      `Missing image: ${product.imageFile}`,
    );
  }
});

test('premium full-combo products retain the advertised 1200 rupee price', () => {
  const premiumCombos = octoberCatalog.filter((product) => product.sku <= 'GSH-OCT10-004');
  assert.equal(premiumCombos.length, 4);
  assert.deepEqual(premiumCombos.map((product) => product.price), [1200, 1200, 1200, 1200]);
});

test('new looks use the storefront combo tier and retain advertised 550 rupee offers', () => {
  const newLooks = octoberCatalog.slice(38);
  assert.equal(newLooks.length, 136);
  assert.equal(newLooks.filter((product) => product.price === 899).length, 134);
  assert.deepEqual(
    newLooks.filter((product) => product.price === 550).map((product) => product.sku),
    ['GSH-OCT10-123', 'GSH-OCT10-128'],
  );
});

test('every imported category has a non-null stable slug', () => {
  assert.equal(categorySlug('Combo Packs'), 'combo-packs');
  assert.equal(categorySlug('Shirts'), 'shirts');
});
