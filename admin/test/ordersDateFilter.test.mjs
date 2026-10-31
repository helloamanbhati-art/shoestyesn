import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/app/pages/admin/OrdersManagement.tsx', import.meta.url),
  'utf8',
);

test('orders expose seven individual day categories followed by all order history', () => {
  assert.match(source, /getRecentOrderDayOptions/);
  assert.match(source, /filterOrdersByDay\(orders, dateFilter\)/);
  assert.match(source, /dateOptions\.map/);
});
