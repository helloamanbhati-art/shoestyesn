import test from 'node:test';
import assert from 'node:assert/strict';

import { clearBuyNowItem, loadBuyNowItem, saveBuyNowItem } from '../src/app/checkout/buyNowStorage.ts';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const item = {
  id: 'product-1',
  name: 'Shirt and jeans set',
  price: 1299,
  quantity: 1,
  selectedComponents: [
    { componentId: 'shirt', name: 'Shirt', size: 'L' },
    { componentId: 'jeans', name: 'Jeans / Trousers', size: '30' },
  ],
};

test('buy now selection is isolated in session storage and can be cleared', () => {
  const storage = new MemoryStorage();

  saveBuyNowItem(item as never, storage);
  assert.deepEqual(loadBuyNowItem(storage), item);

  clearBuyNowItem(storage);
  assert.equal(loadBuyNowItem(storage), null);
});

test('invalid or damaged buy now data is ignored', () => {
  const storage = new MemoryStorage();
  storage.setItem('gujjus:buy-now:v1', '{damaged');
  assert.equal(loadBuyNowItem(storage), null);

  storage.setItem('gujjus:buy-now:v1', JSON.stringify({ id: 'product-1', quantity: 0 }));
  assert.equal(loadBuyNowItem(storage), null);
});
