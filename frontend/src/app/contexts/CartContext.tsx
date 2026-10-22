import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Product, SelectedOutfitComponent, SelectedVariantSnapshot } from '../types/product';
import { useAuth } from './AuthContext';
import {
  addCartItem,
  deleteCart,
  deleteCartItem,
  fetchCart,
  mergeCart,
  setCartItemQuantity,
  type BackendCart,
  type CartSelectionInput,
} from '../cart/cartApi';
import { loadGuestCart, saveGuestCart } from '../guest/guestStorage';

export interface CartItem extends Product {
  cartItemId?: string;
  quantity: number;
  selectedMeters?: number;
  selectedSize?: string;
  selectedComponents?: SelectedOutfitComponent[];
  selectedColor?: string;
  selectedVariant?: SelectedVariantSnapshot;
  isAvailable?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, selectedMeters?: number, selectedSize?: string, selectedColor?: string, selectedVariant?: SelectedVariantSnapshot, quantity?: number, selectedComponents?: SelectedOutfitComponent[]) => Promise<boolean>;
  removeFromCart: (productId: string, selectedMeters?: number, selectedSize?: string, selectedColor?: string, selectedComponents?: SelectedOutfitComponent[]) => void;
  updateQuantity: (productId: string, quantity: number, selectedMeters?: number, selectedSize?: string, selectedColor?: string, selectedComponents?: SelectedOutfitComponent[]) => void;
  updateMeters: (productId: string, currentMeters: number, newMeters: number, selectedSize?: string, selectedColor?: string) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isSyncing: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const componentKey = (components: SelectedOutfitComponent[] = []) => components.map(({ componentId, size }) => `${componentId}:${size}`).sort().join('|');
const matches = (item: CartItem, productId: string, meters?: number, size?: string, color?: string, selectedComponents: SelectedOutfitComponent[] = []) =>
  item.id === productId && item.selectedMeters === meters && item.selectedSize === size && item.selectedColor === color && componentKey(item.selectedComponents) === componentKey(selectedComponents);

const selectionFrom = (item: CartItem): CartSelectionInput => ({
  productId: item.id,
  variantId: item.selectedVariant?.variantId || 'default',
  selectedSize: item.selectedSize || null,
  selectedComponents: item.selectedComponents?.map(({ componentId, size }) => ({ componentId, size })) || [],
  selectedColor: item.selectedColor || null,
  meters: item.selectedMeters || null,
  quantity: item.quantity,
});

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Cart could not be updated. Please try again.';
}

function localTotal(items: CartItem[]) {
  return items.reduce((sum, item) => {
    const price = item.soldBy === 'meter' && item.selectedMeters === 5
      ? item.price + (item.compareAtPrice || 0)
      : item.price;
    return sum + (price + (item.additionalChargeAmount || 0)) * item.quantity;
  }, 0);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => loadGuestCart());
  const [serverTotals, setServerTotals] = useState({ totalItems: 0, totalPrice: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guestItems = useRef<CartItem[]>(loadGuestCart());
  const wasAuthenticated = useRef(false);

  const acceptServerCart = useCallback((cart: BackendCart) => {
    setItems(cart.items);
    setServerTotals({ totalItems: cart.totalItems, totalPrice: cart.totalPrice });
    if (cart.adjustments.length) toast.info('Your cart was updated to match current availability.');
  }, []);

  const sync = useCallback(async (operation: () => Promise<BackendCart>) => {
    setIsSyncing(true);
    setError(null);
    try {
      acceptServerCart(await operation());
      return true;
    } catch (cause) {
      const message = messageFor(cause);
      setError(message);
      toast.error(message);
      try {
        acceptServerCart(await fetchCart());
      } catch {
        // Retain the last known UI state if recovery fails.
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [acceptServerCart]);

  const refreshCart = useCallback(async () => {
    if (isAuthenticated) await sync(fetchCart);
  }, [isAuthenticated, sync]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAuthenticated) {
      if (wasAuthenticated.current) {
        guestItems.current = loadGuestCart();
        setItems(guestItems.current);
        setServerTotals({ totalItems: 0, totalPrice: 0 });
      }
      wasAuthenticated.current = false;
      return;
    }

    wasAuthenticated.current = true;
    const pending = guestItems.current;
    guestItems.current = [];
    saveGuestCart([]);
    void sync(() => pending.length ? mergeCart(pending.map(selectionFrom)) : fetchCart());
  }, [status, isAuthenticated, sync]);

  const updateGuest = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setItems((current) => {
      const next = updater(current);
      guestItems.current = next;
      saveGuestCart(next);
      return next;
    });
  }, []);

  const addToCart = useCallback(async (product: Product, meters?: number, size?: string, color?: string, selectedVariant?: SelectedVariantSnapshot, quantity = 1, selectedComponents: SelectedOutfitComponent[] = []) => {
    const matchedVariant = selectedVariant || product.variants?.find((variant) => variant.variantName === color) || product.variants?.[0];
    const snapshot: SelectedVariantSnapshot = selectedVariant || {
      variantId: matchedVariant?.variantId || 'default',
      variantName: matchedVariant?.variantName || color || 'Default',
      color: color || matchedVariant?.variantName || null,
      pattern: product.name,
      sku: null,
      thumbnail: matchedVariant?.images?.[0]?.imageUrl || product.image || null,
      primaryImage: matchedVariant?.images?.find((image) => image.isPrimary)?.imageUrl || matchedVariant?.images?.[0]?.imageUrl || product.image || null,
      galleryImages: matchedVariant?.images?.map((image) => image.imageUrl) || product.images || [],
      priceAtPurchase: product.price,
    };

    if (isAuthenticated) {
      return sync(() => addCartItem({
        productId: product.id,
        variantId: snapshot.variantId,
        selectedSize: size || null,
        selectedComponents: selectedComponents.map(({ componentId, size: componentSize }) => ({ componentId, size: componentSize })),
        selectedColor: color || null,
        meters: meters || null,
        quantity,
      }));
      return;
    }

    updateGuest((current) => {
      const existing = current.find((item) => matches(item, product.id, meters, size, color, selectedComponents));
      if (existing) {
        return current.map((item) => matches(item, product.id, meters, size, color, selectedComponents)
          ? { ...item, quantity: item.quantity + quantity }
          : item);
      }
      return [...current, { ...product, quantity, selectedMeters: meters, selectedSize: size, selectedComponents, selectedColor: color, selectedVariant: snapshot, isAvailable: true }];
    });
    return true;
  }, [isAuthenticated, sync, updateGuest]);

  const findItem = useCallback((productId: string, meters?: number, size?: string, color?: string, selectedComponents?: SelectedOutfitComponent[]) =>
    items.find((item) => matches(item, productId, meters, size, color, selectedComponents)), [items]);

  const removeFromCart = useCallback((productId: string, meters?: number, size?: string, color?: string, selectedComponents?: SelectedOutfitComponent[]) => {
    const item = findItem(productId, meters, size, color, selectedComponents);
    if (isAuthenticated && item?.cartItemId) {
      void sync(() => deleteCartItem(item.cartItemId!));
      return;
    }
    updateGuest((current) => current.filter((candidate) => !matches(candidate, productId, meters, size, color, selectedComponents)));
  }, [findItem, isAuthenticated, sync, updateGuest]);

  const updateQuantity = useCallback((productId: string, quantity: number, meters?: number, size?: string, color?: string, selectedComponents?: SelectedOutfitComponent[]) => {
    if (quantity <= 0) {
      removeFromCart(productId, meters, size, color, selectedComponents);
      return;
    }
    const item = findItem(productId, meters, size, color, selectedComponents);
    if (isAuthenticated && item?.cartItemId) {
      void sync(() => setCartItemQuantity(item.cartItemId!, quantity));
      return;
    }
    updateGuest((current) => current.map((candidate) => matches(candidate, productId, meters, size, color, selectedComponents)
      ? { ...candidate, quantity }
      : candidate));
  }, [findItem, isAuthenticated, removeFromCart, sync, updateGuest]);

  const updateMeters = useCallback((productId: string, currentMeters: number, newMeters: number, size?: string, color?: string) => {
    const item = findItem(productId, currentMeters, size, color);
    if (!item) return;
    if (isAuthenticated && item.cartItemId) {
      void sync(async () => {
        await deleteCartItem(item.cartItemId!);
        return addCartItem({ ...selectionFrom(item), meters: newMeters });
      });
      return;
    }
    updateGuest((current) => current.map((candidate) => candidate === item ? { ...candidate, selectedMeters: newMeters } : candidate));
  }, [findItem, isAuthenticated, sync, updateGuest]);

  const clearCart = useCallback(() => {
    if (isAuthenticated) {
      void sync(deleteCart);
      return;
    }
    guestItems.current = [];
    saveGuestCart([]);
    setItems([]);
  }, [isAuthenticated, sync]);

  const calculatedItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const calculatedTotal = useMemo(() => localTotal(items), [items]);

  return <CartContext.Provider value={{
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateMeters,
    clearCart,
    refreshCart,
    totalItems: isAuthenticated ? serverTotals.totalItems : calculatedItems,
    totalPrice: isAuthenticated ? serverTotals.totalPrice : calculatedTotal,
    isSyncing,
    error,
  }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
