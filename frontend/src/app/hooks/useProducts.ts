import { useState, useEffect } from 'react';
import { API_BASE_URL, resilientFetch } from '../api/client';

export interface VariantImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  variantId: string;
  variantName: string;
  images: VariantImage[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  images: string[];
  colors?: string[];
  variants?: ProductVariant[];
  category: string;
  description: string;
  shortDescription?: string;
  soldBy: 'meter' | 'piece';
  availableSizes?: string[];
  clothingType?: string;
  inStock?: boolean;
  compareAtPrice?: number;
}

// Version bumps intentionally invalidate older partial catalogs saved by previous loaders.
const PRODUCT_CACHE_KEY = 'shoe-style-storefront-products-v3';
const PRODUCT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const INITIAL_PRODUCT_PAGE_SIZE = 24;
const PRODUCT_REFRESH_INTERVAL_MS = 5 * 60_000;

const transformProduct = (product: any): Product => {
  const rawImages: string[] = Array.isArray(product.images) ? product.images : [];
  const validImages = rawImages.filter((url: string) => url && url.trim().length > 0);
  const primaryImage = product.image && product.image.trim()
    ? product.image
    : validImages[0] || '';

  const fallbackImages = validImages.length > 0 ? validImages : (primaryImage ? [primaryImage] : []);
  
  const variants = Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants.map((v: any) => ({
        variantId: v.variantId || v._id || '',
        variantName: v.variantName || v.name || 'Default',
        images: Array.isArray(v.images)
          ? v.images.map((img: any) => ({
              imageUrl: typeof img === 'string' ? img : img.imageUrl,
              isPrimary: img.isPrimary ?? false,
              sortOrder: img.sortOrder ?? 0,
            }))
          : [],
      }))
    : fallbackImages.length > 0
      ? [{
          variantId: 'default',
          variantName: 'Default',
          images: fallbackImages.map((img, i) => ({
            imageUrl: img,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        }]
      : [];

  return {
    id: product._id || product.id,
    name: product.name,
    brand: typeof product.brand === 'object'
      ? product.brand?.name || ''
      : product.brand || '',
    price: product.price,
    image: primaryImage,
    images: fallbackImages,
    colors: Array.isArray(product.colors) ? product.colors : [],
    variants,
    category: typeof product.category === 'object'
      ? product.category?.name || ''
      : product.category || '',
    description: product.description || product.shortDescription || '',
    shortDescription: product.shortDescription || '',
    soldBy: product.soldBy || 'piece',
    availableSizes: Array.isArray(product.availableSizes) ? product.availableSizes : [],
    clothingType: product.clothingType || '',
    inStock: product.inStock !== false,
    compareAtPrice: product.compareAtPrice || 0,
  };
};

function readPersistentProducts(): Product[] | null {
  try {
    const stored = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!stored) return null;
    const cache = JSON.parse(stored);
    if (
      !Array.isArray(cache?.products) ||
      typeof cache?.savedAt !== 'number' ||
      Date.now() - cache.savedAt > PRODUCT_CACHE_MAX_AGE_MS
    ) {
      localStorage.removeItem(PRODUCT_CACHE_KEY);
      return null;
    }
    return cache.products;
  } catch {
    return null;
  }
}

function persistProducts(products: Product[]) {
  try {
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({ products, savedAt: Date.now() }));
  } catch {
    // Memory cache still provides instant navigation when storage is unavailable or full.
  }
}

// A versioned local cache makes reloads render immediately while data revalidates.
let _cachedProducts: Product[] | null = readPersistentProducts();
let _isFetching = false;
const _listeners: Array<(products: Product[]) => void> = [];

async function fetchAndCacheProducts(
  forceRefresh = false,
  onFirstPage?: (products: Product[]) => void,
): Promise<Product[]> {
  if (_cachedProducts && !forceRefresh) return _cachedProducts;
  if (_isFetching) {
    // Wait for in-progress fetch
    return new Promise((resolve) => {
      _listeners.push(resolve);
    });
  }

  _isFetching = true;
  try {
    const fetchProductPage = async (page: number) => {
      const response = await resilientFetch(`${API_BASE_URL}/api/v1/products?limit=${INITIAL_PRODUCT_PAGE_SIZE}&view=card&page=${page}&catalogRefresh=${forceRefresh ? Date.now() : 0}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const errorBody = await response.json();
          if (errorBody?.message) message = errorBody.message;
        } catch { /* ignore */ }
        throw new Error(`Failed to fetch products: ${response.status} ${message}`);
      }

      return response.json();
    };

    let page = 1;
    const allRawProducts: any[] = [];
    let pageCount = 1;

    do {
      const data = await fetchProductPage(page);
      const pageProducts = data.data || data.products || [];
      allRawProducts.push(...pageProducts);
      if (page === 1 && onFirstPage) {
        const firstProducts = pageProducts.map(transformProduct);
        _cachedProducts = firstProducts;
        persistProducts(firstProducts);
        onFirstPage(firstProducts);
      }
      pageCount = Math.max(Number(data.pagination?.pages) || 1, 1);
      page += 1;
    } while (page <= pageCount);

    const products = Array.from(
      new Map(allRawProducts.map((product) => [product._id || product.id, product])).values(),
    ).map(transformProduct);
    _cachedProducts = products;
    persistProducts(products);
    // Notify any waiting listeners
    _listeners.forEach((cb) => cb(products));
    _listeners.length = 0;
    return products;
  } finally {
    _isFetching = false;
  }
}

export function useProducts() {
  // Start with cached data immediately if available (instant render)
  const [products, setProducts] = useState<Product[]>(_cachedProducts ?? []);
  const [loading, setLoading] = useState(_cachedProducts === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let firstPageRendered = false;
    if (_cachedProducts) {
      // Already have data — show it instantly, then do a silent background refresh
      setProducts(_cachedProducts);
      setLoading(false);
      fetchAndCacheProducts(true)
        .then((fresh) => {
          _cachedProducts = fresh;
          setProducts(fresh);
        })
        .catch(() => { /* ignore background refresh errors */ });
      return;
    }

    fetchAndCacheProducts(true, (firstProducts) => {
      firstPageRendered = true;
      setProducts(firstProducts);
      setLoading(false);
    })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        if (firstPageRendered) return;
        const message = err instanceof Error ? err.message : 'Failed to fetch products';
        setError(message);
        setLoading(false);
        console.error('Error fetching products:', message);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshProducts = () => {
      if (!navigator.onLine || document.visibilityState !== 'visible') return;
      fetchAndCacheProducts(true)
        .then((fresh) => {
          if (cancelled) return;
          setProducts(fresh);
          setError(null);
        })
        .catch(() => {
          // Keep the last known catalog visible during a temporary refresh failure.
        });
    };

    const refreshVisibleProducts = () => {
      if (document.visibilityState === 'visible') refreshProducts();
    };

    window.addEventListener('focus', refreshProducts);
    document.addEventListener('visibilitychange', refreshVisibleProducts);
    const refreshInterval = window.setInterval(refreshProducts, PRODUCT_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshProducts);
      document.removeEventListener('visibilitychange', refreshVisibleProducts);
      window.clearInterval(refreshInterval);
    };
  }, []);

  return { products, loading, error };
}

export function useCatalogCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    resilientFetch(`${API_BASE_URL}/api/v1/catalog/categories`, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const records = payload.data || payload.categories || [];
        setCategories(
          records
            .map((category: any) => category.name)
            .filter(Boolean)
            .sort((a: string, b: string) => a.localeCompare(b)),
        );
      })
      .catch((error) => console.error('Error fetching catalog categories:', error));
  }, []);

  return categories;
}

export function useProductById(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await resilientFetch(`${API_BASE_URL}/api/v1/products/${productId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let message = response.statusText;
          try {
            const errorBody = await response.json();
            if (errorBody?.message) {
              message = errorBody.message;
            }
          } catch {
            // ignore parse failure
          }
          throw new Error(`Failed to fetch product: ${response.status} ${message}`);
        }

        const data = await response.json();
        const rawProduct = data.data || data.product;
        
        if (!rawProduct) {
          throw new Error('Product not found');
        }

        setProduct(transformProduct(rawProduct));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch product';
        setError(message);
        console.error('Error fetching product:', message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, loading, error };
}
