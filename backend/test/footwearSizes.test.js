const assert = require('node:assert/strict');
const test = require('node:test');

const { FOOTWEAR_SIZES, filterSupportedFootwearSizes } = require('../src/utils/footwearSizes');

test('supported footwear sizes start at EU 36', () => {
  assert.deepEqual(FOOTWEAR_SIZES, ['36', '37', '38', '39', '40', '41']);
});

test('legacy EU size 35 is removed from saved and public size lists', () => {
  assert.deepEqual(filterSupportedFootwearSizes(['35', '36', 37, '35', '41']), ['36', '37', '41']);
});
