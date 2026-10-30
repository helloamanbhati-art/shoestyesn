const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVisitorHash,
  getDayKey,
  getRecentDayKeys,
} = require('../src/services/visitorAnalyticsService');

test('visitor IDs are stored as stable hashes instead of raw browser identifiers', () => {
  const first = buildVisitorHash('550e8400-e29b-41d4-a716-446655440000');
  const second = buildVisitorHash('550e8400-e29b-41d4-a716-446655440000');

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, '550e8400-e29b-41d4-a716-446655440000');
});

test('day keys use India time around the UTC date boundary', () => {
  assert.equal(getDayKey(new Date('2026-10-29T18:29:59.000Z')), '2026-10-29');
  assert.equal(getDayKey(new Date('2026-10-29T18:30:00.000Z')), '2026-10-30');
});

test('recent day keys include today and remain in chronological order', () => {
  assert.deepEqual(
    getRecentDayKeys(3, new Date('2026-10-29T12:00:00.000Z')),
    ['2026-10-27', '2026-10-28', '2026-10-29'],
  );
});
