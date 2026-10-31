import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useCatalogCategories, useProducts, Product } from '../hooks/useProducts';

interface ProductContextType {
  products: Product[];
  categories: string[];
  loading: boolean;
  error: string | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { products, loading, error } = useProducts();
  const catalogCategories = useCatalogCategories();
  const categories = useMemo(() => {
    if (catalogCategories.length > 0) return catalogCategories;
    return Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort();
  }, [catalogCategories, products]);

  return (
    <ProductContext.Provider value={{ products, categories, loading, error }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProductContext() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within ProductProvider');
  }
  return context;
}
