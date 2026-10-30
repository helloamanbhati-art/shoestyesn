import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { adminRequest } from '../api/client';

export interface Brand {
  id: string;
  name: string;
  productCount?: number;
}

interface BrandContextType {
  brands: Brand[];
  loading: boolean;
  error: string | null;
  addBrand: (brand: Brand) => Promise<boolean>;
  updateBrand: (id: string, brand: Brand) => Promise<boolean>;
  deleteBrand: (id: string) => Promise<boolean>;
  getBrandById: (id: string) => Brand | undefined;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { admin, loading: authLoading } = useAdminAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      if (authLoading) return;
      if (!admin) {
        setBrands([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await adminRequest<{ brands: any[] }>('/api/v1/admin/brands');
        const mapped = (data.brands || [])
          .filter((b: any) => b.name && b.name.toLowerCase() !== 'unknown')
          .map((b: any) => ({
            id: b._id || b.id,
            name: b.name,
            productCount: b.productCount || 0,
          }));
        setBrands(mapped);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('[fetchBrands] Exception:', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, [admin, authLoading]);

  const addBrand = async (brand: Brand): Promise<boolean> => {
    try {
      const data = await adminRequest<{ brand: any }>('/api/v1/admin/brands', {
        method: 'POST',
        body: JSON.stringify({ name: brand.name }),
      });
      setBrands(prev => [...prev, {
        id: data.brand._id || data.brand.id,
        name: data.brand.name,
        productCount: 0,
      }]);
      return true;
    } catch (error) {
      console.error('[addBrand] Exception:', error);
      return false;
    }
  };

  const updateBrand = async (id: string, brand: Brand): Promise<boolean> => {
    try {
      await adminRequest(`/api/v1/admin/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: brand.name }),
      });
      setBrands(prev => prev.map(b => b.id === id ? { ...b, name: brand.name } : b));
      return true;
    } catch (error) {
      console.error('Error updating brand:', error);
      return false;
    }
  };

  const deleteBrand = async (id: string): Promise<boolean> => {
    try {
      await adminRequest(`/api/v1/admin/brands/${id}`, {
        method: 'DELETE',
      });
      setBrands(prev => prev.filter(b => b.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting brand:', error);
      return false;
    }
  };

  const getBrandById = (id: string) => {
    return brands.find(b => b.id === id);
  };

  return (
    <BrandContext.Provider value={{ brands, loading, error, addBrand, updateBrand, deleteBrand, getBrandById }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrands() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrands must be used within BrandProvider');
  }
  return context;
}
