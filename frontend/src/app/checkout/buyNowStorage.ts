import type { CartItem } from '../contexts/CartContext';

const BUY_NOW_KEY = 'shoe-fashion:buy-now:v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveBuyNowItem(item: CartItem, storage: StorageLike = window.sessionStorage) {
  storage.setItem(BUY_NOW_KEY, JSON.stringify(item));
}

export function loadBuyNowItem(storage: StorageLike = window.sessionStorage): CartItem | null {
  try {
    const item = JSON.parse(storage.getItem(BUY_NOW_KEY) || 'null') as CartItem | null;
    return item
      && typeof item.id === 'string'
      && item.id.length > 0
      && Number.isInteger(item.quantity)
      && item.quantity > 0
      ? item
      : null;
  } catch {
    return null;
  }
}

export function clearBuyNowItem(storage: StorageLike = window.sessionStorage) {
  storage.removeItem(BUY_NOW_KEY);
}
