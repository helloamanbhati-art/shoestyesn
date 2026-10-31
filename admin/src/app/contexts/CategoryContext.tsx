import { createContext, useCallback, useContext, useState, ReactNode, useEffect } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { adminRequest } from '../api/client';

export interface Category {
  id: string;
  name: string;
  productCount?: number;
}

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  reloadCategories: () => Promise<void>;
  addCategory: (category: Category) => Promise<boolean>;
  updateCategory: (id: string, category: Category) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  getCategoryById: (id: string) => Category | undefined;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { admin, loading: authLoading } = useAdminAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadCategories = useCallback(async () => {
    if (authLoading) return;
    if (!admin) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminRequest<{ categories: any[] }>('/api/v1/admin/categories');
      const mapped = (data.categories || []).map((category: any) => ({
        id: category._id || category.id,
        name: category.name,
        productCount: category.productCount || 0,
      }));
      setCategories(mapped);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'An unexpected error occurred';
      console.error('[fetchCategories] Exception:', requestError);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [admin, authLoading]);

  useEffect(() => {
    void reloadCategories();
  }, [reloadCategories]);

  useEffect(() => {
    if (!admin) return;
    const reloadWhenOnline = () => { void reloadCategories(); };
    window.addEventListener('online', reloadWhenOnline);
    return () => window.removeEventListener('online', reloadWhenOnline);
  }, [admin, reloadCategories]);

  const addCategory = async (category: Category): Promise<boolean> => {
    try {
      const creationKey = `admin_category_${crypto.randomUUID().replaceAll('-', '')}`;
      const data = await adminRequest<{ category: any }>('/api/v1/admin/categories', {
        method: 'POST',
        headers: { 'Idempotency-Key': creationKey },
        body: JSON.stringify({ name: category.name }),
      });
      setCategories(prev => [...prev, {
        id: data.category._id || data.category.id,
        name: data.category.name,
        productCount: 0,
      }]);
      return true;
    } catch (error) {
      console.error('[addCategory] Exception:', error);
      return false;
    }
  };

  const updateCategory = async (id: string, category: Category): Promise<boolean> => {
    try {
      await adminRequest(`/api/v1/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: category.name }),
      });
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name: category.name } : c));
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      await adminRequest(`/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
      });
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id);
  };

  return (
    <CategoryContext.Provider value={{ categories, loading, error, reloadCategories, addCategory, updateCategory, deleteCategory, getCategoryById }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
}
