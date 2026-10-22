import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/ProductsManagement.tsx', import.meta.url),
  'utf8',
);

test('product form matches the clothing fields shown on the storefront', () => {
  assert.match(source, /Product Name \*/);
  assert.match(source, /Selling Price \(₹\) \*/);
  assert.match(source, /MRP \(₹\)/);
  assert.match(source, /Category \*/);
  assert.match(source, /Product type/);
  assert.match(source, /Available sizes/);
  assert.match(source, /Product Description/);
  assert.match(source, /Colours, Photos & Videos \*/);
});

test('product form omits generic fields that do not apply to this catalog', () => {
  assert.doesNotMatch(source, /<Label htmlFor="soldBy">/);
  assert.doesNotMatch(source, /<Label htmlFor="brand">/);
  assert.doesNotMatch(source, /Additional Charge/);
  assert.match(source, /soldBy: 'piece'/);
  assert.match(source, /brand: editingProduct\?\.brand \|\| 'GUJJUS STYLE HUB'/);
});

test('outfit items provide ready-made sizes instead of comma-separated size entry', () => {
  assert.match(source, /Shirt: \['S', 'M', 'L', 'XL', 'XXL'\]/);
  assert.match(source, /'Jeans \/ Trousers': \['28', '30', '32', '34', '36', '38'\]/);
  assert.match(source, /Shoes: \['6', '7', '8', '9', '10'\]/);
  assert.match(source, /Add full outfit/);
  assert.match(source, /Select all/);
  assert.match(source, /component-size-/);
  assert.doesNotMatch(source, /Separate sizes with commas\./);
  assert.doesNotMatch(source, /New product size/);
  assert.doesNotMatch(source, /Add a size, e\.g\. M\(38\)/);
  assert.doesNotMatch(source, /handleAddProductSize/);
});
