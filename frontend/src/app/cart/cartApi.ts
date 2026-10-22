import { apiRequest } from '../api/client';
import type { Product, SelectedOutfitComponent, SelectedVariantSnapshot } from '../types/product';

interface ServerCartProduct extends Omit<Product, 'brand' | 'category'> {
  brand: string | { name?: string } | null;
  category: string | { name?: string } | null;
}

interface ServerCartItem {
  id: string;
  product: ServerCartProduct | null;
  variantId: string;
  selectedSize: string | null;
  selectedComponents: SelectedOutfitComponent[];
  selectedColor: string | null;
  meters: number | null;
  quantity: number;
  isAvailable: boolean;
}

export interface CartSelectionInput {
  productId: string;
  variantId?: string | null;
  selectedSize?: string | null;
  selectedComponents?: Array<{ componentId: string; size: string }>;
  selectedColor?: string | null;
  meters?: number | null;
  quantity: number;
}

export interface BackendCartItem extends Product {
  cartItemId: string;
  quantity: number;
  selectedMeters?: number;
  selectedSize?: string;
  selectedComponents?: SelectedOutfitComponent[];
  selectedColor?: string;
  selectedVariant?: SelectedVariantSnapshot;
  isAvailable: boolean;
}

export interface BackendCart {
  id: string | null;
  items: BackendCartItem[];
  totalItems: number;
  totalPrice: number;
  adjustments: Array<{
    productId: string;
    requestedQuantity: number;
    appliedQuantity: number;
    reason: string;
  }>;
}

function displayName(value: ServerCartProduct['brand'], fallback: string): string {
  if (typeof value === 'string') return value;
  return value?.name || fallback;
}

function toCart(data: {
  id?: string | null;
  items?: ServerCartItem[];
  summary?: { totalItems?: number; subtotal?: number };
  adjustments?: BackendCart['adjustments'];
}): BackendCart {
  const items = (data.items || []).flatMap((item) => {
    if (!item.product) return [];
    const product: Product = {
      ...item.product,
      brand: displayName(item.product.brand, 'Unknown Brand'),
      category: displayName(item.product.category, 'Uncategorized'),
      image: item.product.image || '',
      images: item.product.images || [],
    };
    const variant = product.variants?.find((candidate) => candidate.variantId === item.variantId);
    const selectedVariant: SelectedVariantSnapshot | undefined = variant ? {
      variantId: variant.variantId,
      variantName: variant.variantName,
      color: item.selectedColor || variant.variantName,
      pattern: product.name,
      sku: null,
      thumbnail: variant.images?.[0]?.imageUrl || product.image,
      primaryImage: variant.images?.find((image) => image.isPrimary)?.imageUrl || variant.images?.[0]?.imageUrl || product.image,
      galleryImages: variant.images?.map((image) => image.imageUrl) || product.images,
      priceAtPurchase: product.price,
    } : undefined;

    return [{
      ...product,
      cartItemId: item.id,
      quantity: item.quantity,
      selectedMeters: item.meters || undefined,
      selectedSize: item.selectedSize || undefined,
      selectedComponents: item.selectedComponents || [],
      selectedColor: item.selectedColor || undefined,
      selectedVariant,
      isAvailable: item.isAvailable,
    }];
  });

  return {
    id: data.id || null,
    items,
    totalItems: data.summary?.totalItems || 0,
    totalPrice: data.summary?.subtotal || 0,
    adjustments: data.adjustments || [],
  };
}

export async function fetchCart(): Promise<BackendCart> {
  return toCart(await apiRequest('/api/v1/cart'));
}

export async function addCartItem(input: CartSelectionInput): Promise<BackendCart> {
  return toCart(await apiRequest('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify(input),
  }));
}

export async function mergeCart(items: CartSelectionInput[]): Promise<BackendCart> {
  return toCart(await apiRequest('/api/v1/cart/merge', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }));
}

export async function setCartItemQuantity(itemId: string, quantity: number): Promise<BackendCart> {
  return toCart(await apiRequest(`/api/v1/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  }));
}

export async function deleteCartItem(itemId: string): Promise<BackendCart> {
  return toCart(await apiRequest(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' }));
}

export async function deleteCart(): Promise<BackendCart> {
  return toCart(await apiRequest('/api/v1/cart', { method: 'DELETE' }));
}
