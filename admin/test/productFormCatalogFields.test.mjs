import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url),
  'utf8',
);

test('product form matches the footwear fields shown on the storefront', () => {
  assert.match(source, /Product Name \*/);
  assert.match(source, /Selling Price \(₹\) \*/);
  assert.match(source, /MRP \(₹\)/);
  assert.match(source, /Category \*/);
  assert.match(source, /Footwear type/);
  assert.match(source, /quantity by size/);
  assert.match(source, /Product Description/);
  assert.match(source, /Colours, Photos & Videos \*/);
});

test('product form omits generic fields that do not apply to this catalog', () => {
  assert.doesNotMatch(source, /<Label htmlFor="soldBy">/);
  assert.doesNotMatch(source, /<Label htmlFor="brand">/);
  assert.doesNotMatch(source, /Additional Charge/);
  assert.match(source, /soldBy: 'piece'/);
  assert.match(source, /brand: editingProduct\?\.brand \|\| 'Shoe Fashion'/);
});

test('footwear products provide EU sizes 36 through 41 without size 35', () => {
  assert.match(source, /FOOTWEAR_SIZES = \['36', '37', '38', '39', '40', '41'\]/);
  assert.doesNotMatch(source, /FOOTWEAR_SIZES = \[[^\]]*'35'/);
  assert.doesNotMatch(source, /FOOTWEAR_SIZES = \['3', '4', '5', '6', '7', '8'\]/);
  assert.match(source, /Use 0 when sold out/);
  assert.doesNotMatch(source, /Add full outfit/);
  assert.doesNotMatch(source, /Separate sizes with commas\./);
  assert.doesNotMatch(source, /New product size/);
  assert.doesNotMatch(source, /Add a size, e\.g\. M\(38\)/);
  assert.doesNotMatch(source, /handleAddProductSize/);
});

test('admin can enter an exact quantity for every footwear size', () => {
  assert.match(source, /variantSizeQuantities/);
  assert.match(source, /quantity for EU size/);
  assert.match(source, /sizeStock:/);
  assert.match(source, /Total: \{total\}/);
});

test('admin exposes independent quantities under each variant card', () => {
  assert.match(source, /variantsDraft\.map\(\(variant, index\)/);
  assert.match(source, /variantSizeQuantities\[variant\.clientId\]/);
  assert.match(source, /variantStockRows = finalizedVariants\.flatMap/);
});

test('editing keeps each variant quantity instead of copying aggregate stock into it', () => {
  assert.match(source, /String\(variant\.sizeStock\?\.find\(\(entry\) => entry\.size === size\)\?\.available \?\? 0\)/);
  assert.doesNotMatch(source, /variant\.sizeStock\?\.find\(\(entry\) => entry\.size === size\)\?\.available \?\? sharedSizeQuantities\[size\]/);
});

test('admin explicitly controls whether a product displays the NEW badge', () => {
  assert.match(source, /id="isNewArrival"/);
  assert.match(source, /Show NEW badge on storefront/);
  assert.match(source, /isNewArrival: formData\.isNewArrival/);
});

test('footwear type dropdown provides women footwear choices instead of apparel choices', () => {
  assert.match(
    source,
    /WOMENS_FOOTWEAR_TYPES = \[\s*'Sneakers',\s*'Flats',\s*'Sandals',\s*'Heels',\s*'Wedges',\s*'Loafers',\s*'Mules',\s*'Slippers',\s*'Ankle Boots',\s*'Knee Boots',?\s*\]/,
  );
  assert.match(source, /setClothingTypeOptions\(savedTypes\.length && !containsLegacyApparel \? savedTypes : WOMENS_FOOTWEAR_TYPES\)/);
  assert.match(source, /clothingTypeOptions\.map\(\(type\) =>/);
});
