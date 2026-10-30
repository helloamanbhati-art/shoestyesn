const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProductSearchFilter,
  normalizeProductSearchRequest,
} = require('../src/services/productSearchQuery');

test('product search matches every customer-facing catalog field', () => {
  const filter = buildProductSearchFilter('blue', ['category-id']);
  const searchableFields = filter.$and[1].$or.map((condition) => Object.keys(condition)[0]);

  assert.deepEqual(searchableFields, [
    'name',
    'colors',
    'clothingType',
    'description',
    'shortDescription',
    'category',
  ]);
});

test('product search escapes regex syntax and only includes active products', () => {
  const filter = buildProductSearchFilter('boot.*', []);

  assert.deepEqual(filter.$and[0], { isActive: true });
  assert.equal(filter.$and[1].$or[0].name.$regex, 'boot\\.\\*');
  assert.equal(filter.$and[1].$or[0].name.$options, 'i');
});

test('product search trims queries and bounds result limits', () => {
  assert.deepEqual(normalizeProductSearchRequest({ q: '  ankle boot  ', limit: '500' }), {
    term: 'ankle boot',
    limit: 50,
  });
});

test('product search rejects missing or oversized queries', () => {
  assert.throws(() => normalizeProductSearchRequest({ q: '   ' }), /Search query required/);
  assert.throws(() => normalizeProductSearchRequest({ q: 'x'.repeat(101) }), /100 characters/);
});
