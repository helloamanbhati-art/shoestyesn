import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/OrdersManagement.tsx', import.meta.url),
  'utf8',
);

test('order details use a full-screen mobile layout and a wide desktop workspace', () => {
  assert.match(source, /h-\[100dvh\].*sm:max-w-\[min\(96vw,80rem\)\]/s);
  assert.match(source, /sticky top-0 z-10/);
  assert.match(source, /<DialogClose asChild>/);
  assert.match(source, /aria-label="Close order details"/);
});

test('order details prioritize scannability with a responsive section grid', () => {
  assert.match(source, /xl:grid-cols-12/);
  assert.match(source, /xl:col-span-8/);
  assert.match(source, /xl:col-span-4/);
});

test('order details hide the temporary status update controls', () => {
  assert.doesNotMatch(source, /Update Order Status/);
  assert.doesNotMatch(source, /handleUpdateStatus/);
  assert.match(source, /xl:col-span-12[\s\S]*?Customer Information/);
});

test('order detail sections use a flat borderless presentation', () => {
  assert.match(
    source,
    /const orderDetailSectionClass = 'rounded-none border-0 bg-transparent shadow-none'/,
  );
  assert.doesNotMatch(
    source,
    /bg-gray-50 dark:bg-gray-900\/50 p-4 rounded-lg border border-gray-200/,
  );
});
