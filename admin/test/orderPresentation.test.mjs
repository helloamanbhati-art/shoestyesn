import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterOrdersByDay,
  formatOrderDateTime,
  getRecentOrderDayOptions,
  isOrderFromToday,
  sortOrdersNewestFirst,
} from '../src/app/utils/orderPresentation.mjs';

test('sortOrdersNewestFirst puts the latest submitted order first without mutating input', () => {
  const orders = [
    { id: 'older', createdAt: '2026-10-09T04:00:00.000Z' },
    { id: 'newest', createdAt: '2026-10-09T09:00:00.000Z' },
    { id: 'middle', createdAt: '2026-10-09T06:00:00.000Z' },
  ];

  assert.deepEqual(sortOrdersNewestFirst(orders).map(({ id }) => id), [
    'newest',
    'middle',
    'older',
  ]);
  assert.equal(orders[0].id, 'older');
});

test('getRecentOrderDayOptions exposes seven individual Indian calendar days then all orders', () => {
  const options = getRecentOrderDayOptions(new Date('2026-10-31T12:00:00.000Z'));

  assert.equal(options.length, 8);
  assert.deepEqual(options.map(({ value }) => value), [
    '2026-10-31',
    '2026-10-30',
    '2026-10-29',
    '2026-10-28',
    '2026-10-27',
    '2026-10-26',
    '2026-10-25',
    'all',
  ]);
  assert.match(options[0].label, /^Today/);
  assert.match(options[1].label, /^Yesterday/);
  assert.equal(options[7].label, 'All orders');
});

test('filterOrdersByDay accepts an individual Indian calendar date', () => {
  const orders = [
    { id: 'selected', createdAt: '2026-10-29T20:00:00.000Z' },
    { id: 'other', createdAt: '2026-10-28T18:00:00.000Z' },
  ];

  assert.deepEqual(filterOrdersByDay(orders, '2026-10-30').map(({ id }) => id), ['selected']);
});

test('formatOrderDateTime displays Indian local date and time', () => {
  assert.equal(
    formatOrderDateTime('2026-10-09T09:00:00.000Z'),
    '09 Oct 2026, 2:30 pm',
  );
});

test('formatOrderDateTime handles missing dates', () => {
  assert.equal(formatOrderDateTime(''), 'Date unavailable');
});

test('filterOrdersByDay filters by Indian calendar days', () => {
  const now = new Date('2026-10-10T12:00:00.000Z');
  const orders = [
    { id: 'today', createdAt: '2026-10-10T02:00:00.000Z' },
    { id: 'yesterday', createdAt: '2026-10-09T12:00:00.000Z' },
    { id: 'six-days-ago', createdAt: '2026-10-04T12:00:00.000Z' },
    { id: 'older', createdAt: '2026-10-03T12:00:00.000Z' },
  ];

  assert.deepEqual(filterOrdersByDay(orders, 'today', now).map(({ id }) => id), ['today']);
  assert.deepEqual(filterOrdersByDay(orders, 'yesterday', now).map(({ id }) => id), ['yesterday']);
  assert.deepEqual(filterOrdersByDay(orders, 'last7', now).map(({ id }) => id), [
    'today',
    'yesterday',
    'six-days-ago',
  ]);
  assert.equal(filterOrdersByDay(orders, 'all', now).length, 4);
});

test('isOrderFromToday uses the Indian local date', () => {
  const now = new Date('2026-10-10T20:00:00.000Z'); // 11 Oct in India

  assert.equal(isOrderFromToday('2026-10-10T19:30:00.000Z', now), true);
  assert.equal(isOrderFromToday('2026-10-10T17:00:00.000Z', now), false);
});
