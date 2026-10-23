import type { CartItem } from '../contexts/CartContext';

const CART_KEY = 'shoe-fashion:guest-cart:v1';
const PROFILE_KEY = 'shoe-fashion:guest-checkout:v1';
const ORDER_TOKENS_KEY = 'shoe-fashion:guest-order-tokens:v1';

export interface GuestCheckoutProfile {
  firstName: string; lastName: string; email: string; phone: string;
  houseName: string; building: string; street: string; landmark: string;
  city: string; state: string; zip: string;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

export function loadGuestCart(): CartItem[] {
  const value = read<unknown>(CART_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CartItem => Boolean(item && typeof item === 'object' && typeof (item as CartItem).id === 'string' && Number.isInteger((item as CartItem).quantity)));
}

export function saveGuestCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items.slice(0, 50)));
}

export function loadGuestCheckoutProfile(): GuestCheckoutProfile | null {
  const value = read<GuestCheckoutProfile | null>(PROFILE_KEY, null);
  return value && typeof value.email === 'string' ? value : null;
}

export function saveGuestCheckoutProfile(profile: GuestCheckoutProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function saveGuestOrderToken(orderId: string, token: string) {
  const tokens = read<Record<string, string>>(ORDER_TOKENS_KEY, {});
  window.localStorage.setItem(ORDER_TOKENS_KEY, JSON.stringify({ ...tokens, [orderId]: token }));
}

export function getGuestOrderToken(orderId: string) {
  return read<Record<string, string>>(ORDER_TOKENS_KEY, {})[orderId] || '';
}

export function getGuestOrderIds() {
  return Object.keys(read<Record<string, string>>(ORDER_TOKENS_KEY, {})).filter((id) => /^[a-f\d]{24}$/i.test(id));
}

export function clearGuestData() {
  window.localStorage.removeItem(CART_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(ORDER_TOKENS_KEY);
}
