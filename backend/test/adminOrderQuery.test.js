const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAdminOrderQuery } = require('../src/services/adminOrderQuery');

test('admin order query bounds pagination for full initial loads', () => {
  const result = buildAdminOrderQuery({ page: '0', limit: '999' });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 100);
  assert.equal(result.skip, 0);
  assert.equal(result.isIncremental, false);
});

test('admin order query supports an indexed incremental updatedAt cursor', () => {
  const result = buildAdminOrderQuery({ since: '2026-10-23T08:00:00.000Z' });
  assert.equal(result.isIncremental, true);
  assert.deepEqual(result.filter.updatedAt, { $gt: new Date('2026-10-23T08:00:00.000Z') });
  assert.deepEqual(result.sort, { updatedAt: 1, _id: 1 });
});

test('admin order search escapes regex operators', () => {
  const result = buildAdminOrderQuery({ search: 'ORD-.*' });
  assert.equal(result.filter.$or[0].orderNumber.$regex, 'ORD-\\.\\*');
});

test('admin order query rejects malformed sync cursors', () => {
  assert.throws(
    () => buildAdminOrderQuery({ since: 'not-a-date' }),
    /Invalid order sync cursor/,
  );
});
