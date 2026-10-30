import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/AdminDashboard.tsx', import.meta.url),
  'utf8',
);

test('dashboard orders are presented as obvious full-width links', () => {
  assert.match(source, /aria-label={`View \${statusLabel\.toLowerCase\(\)} order details for \${orderNumber}`}/);
  assert.match(source, /<Card className="border-0 bg-transparent shadow-none">/);
  assert.match(source, /<CardContent className="px-0">/);
  assert.match(source, /className="group block w-full/);
  assert.match(source, /group block w-full rounded-none bg-white/);
  assert.match(source, /bg-white p-4 shadow-sm/);
  assert.match(source, /<div className="space-y-4">/);
  assert.doesNotMatch(source, /group block w-full rounded-xl bg-gray-50/);
  assert.doesNotMatch(source, /rounded-xl border border-gray-200/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /justify-center gap-2 rounded-none bg-green-600/);
  assert.match(source, /w-full.*View order/s);
});

test('dashboard order cards explain their mobile click target', () => {
  assert.match(source, /Tap anywhere to view details/);
  assert.match(source, /sm:hidden/);
});

test('dashboard orders can be filtered by day and clearly mark today orders', () => {
  assert.match(source, /<label htmlFor="order-day-filter"/);
  assert.match(source, /<option value="today">Today<\/option>/);
  assert.match(source, /<option value="yesterday">Yesterday<\/option>/);
  assert.match(source, /<option value="last7">Last 7 days<\/option>/);
  assert.match(source, /<option value="all">All orders<\/option>/);
  assert.match(source, />Ordered today</);
});

test('dashboard order status is a clear non-interactive label in the top row', () => {
  assert.match(source, /const statusStyles: Record<string, string>/);
  assert.match(source, /pending: 'border-amber-200 bg-amber-50 text-amber-800'/);
  assert.match(source, /confirmed: 'border-green-200 bg-green-50 text-green-800'/);
  assert.match(source, /<Badge[\s\S]*statusStyles\[normalizedStatus\][\s\S]*statusLabel[\s\S]*<\/Badge>/);
  assert.match(source, /<div className="flex items-start justify-between gap-3">/);
  assert.doesNotMatch(source, /<button[^>]*>[\s\S]*statusLabel/);
});

test('dashboard keeps cached orders visible while background synchronization recovers', () => {
  assert.doesNotMatch(source, /Orders could not be loaded\./);
  assert.match(source, /Orders are reconnecting automatically/);
  assert.match(source, /!loading && recentOrders\.length > 0/);
  assert.doesNotMatch(source, /!loading && !error && recentOrders\.length > 0/);
});
