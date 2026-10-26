import { apiRequest } from '../api/client';

type WishlistEntry = { productId: string | { _id?: string; id?: string } };

export async function fetchWishlistIds() {
  const entries = await apiRequest<WishlistEntry[]>('/api/v1/auth/wishlist');
  return entries.map(({ productId }) => typeof productId === 'string' ? productId : productId._id || productId.id || '').filter(Boolean);
}

export function addWishlistProduct(productId: string) {
  return apiRequest('/api/v1/auth/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
}

export function removeWishlistProduct(productId: string) {
  return apiRequest(`/api/v1/auth/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}
