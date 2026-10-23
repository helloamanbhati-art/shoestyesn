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
  assert.match(source, /Available sizes/);
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

test('footwear products provide EU sizes 35 through 41', () => {
  assert.match(source, /FOOTWEAR_SIZES = \['35', '36', '37', '38', '39', '40', '41'\]/);
  assert.doesNotMatch(source, /FOOTWEAR_SIZES = \['3', '4', '5', '6', '7', '8'\]/);
  assert.match(source, /Select all/);
  assert.doesNotMatch(source, /Add full outfit/);
  assert.doesNotMatch(source, /Separate sizes with commas\./);
  assert.doesNotMatch(source, /New product size/);
  assert.doesNotMatch(source, /Add a size, e\.g\. M\(38\)/);
  assert.doesNotMatch(source, /handleAddProductSize/);
});
