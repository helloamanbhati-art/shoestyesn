import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { API_BASE_URL } from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Plus, Search, Pencil, Trash2, Package, Loader2, Images, Link, Check, SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router';
import { useBrands } from '../../contexts/BrandContext';
import { useCategories } from '../../contexts/CategoryContext';
import {
  VariantManager,
  VariantDraft,
  newVariantDraft,
} from '../../components/admin/VariantManager';
import { buildProductShareUrl } from '../../utils/productShareLink.mjs';

const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL || 'https://shoefashion.in').replace(/\/+$/, '');

interface VariantImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface ProductVariant {
  variantId: string;
  variantName: string;
  images: VariantImage[];
}

interface OutfitComponent { componentId: string; name: string; availableSizes: string[]; }

const FOOTWEAR_SIZES = ['35', '36', '37', '38', '39', '40', '41'];

interface Product {
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
  soldBy: 'meter' | 'piece';
  clothingType?: string;
  availableSizes?: string[];
  outfitComponents?: OutfitComponent[];
  inStock?: boolean;
  compareAtPrice?: number;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(?:[?#]|$)/i.test(url);

function ProductMediaPreview({ src, name, className }: { src: string; name: string; className: string }) {
  if (isVideoUrl(src)) {
    return <video src={src} aria-label={`${name} video`} className={className} controls preload="metadata" />;
  }

  return <img src={src} alt={name} className={className} />;
}

const initialProducts: Product[] = [];
// Note: Products are now fetched from the real API

export function ProductsManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnToDashboardRef = useRef(false);
  const { brands } = useBrands();
  const { categories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [clothingTypeOptions, setClothingTypeOptions] = useState<string[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
  const [productRefreshKey, setProductRefreshKey] = useState(0);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [popoverProductId, setPopoverProductId] = useState<string | null>(null);

const getAuthHeaders = () => {
  return {};
};

// Load products from API on mount
useEffect(() => {
  let active = true;
  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/products?limit=500`, {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Product catalog returned ${res.status}`);
      const data = await res.json();
      const mapped = (data.data || []).map((p: any) => {
        // Handle brand - could be string, object, or missing
        let brandName = '';
        if (typeof p.brand === 'string') {
          brandName = p.brand;
        } else if (p.brand && typeof p.brand === 'object') {
          brandName = p.brand.name || String(p.brand._id || '') || '';
        }

        // Handle category - could be string, object, or missing
        let categoryName = '';
        if (typeof p.category === 'string') {
          categoryName = p.category;
        } else if (p.category && typeof p.category === 'object') {
          categoryName = p.category.name || String(p.category._id || '') || '';
        }

        return {
          id: p._id || p.id,
          name: p.name,
          brand: brandName,
          category: categoryName,
          price: p.price,
          image: p.image,
          images: p.images || [],
          colors: p.colors || [],
          variants: (p.variants || []).map((v: any) => ({
            variantId: v.variantId || v._id || '',
            variantName: v.variantName || v.name || 'Default',
            images: Array.isArray(v.images)
              ? v.images.map((img: any) => ({
                  imageUrl: typeof img === 'string' ? img : img.imageUrl,
                  isPrimary: img.isPrimary ?? false,
                  sortOrder: img.sortOrder ?? 0,
                }))
              : [],
          })),
          description: p.description,
          soldBy: p.soldBy,
          clothingType: p.clothingType || '',
          availableSizes: p.availableSizes || [],
          outfitComponents: p.outfitComponents || [],
          inStock: p.inStock ?? true,
          compareAtPrice: p.compareAtPrice || 0,
        };
      });
      if (active) {
        setProducts(mapped);
        setProductsLoadError(null);
      }
    } catch (err) {
      if (active) setProductsLoadError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      if (active) setIsLoadingProducts(false);
    }
  };
  void fetchProducts();
  return () => { active = false; };
}, [productRefreshKey]);

useEffect(() => {
  const timer = window.setInterval(() => setProductRefreshKey((key) => key + 1), 30_000);
  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') setProductRefreshKey((key) => key + 1);
  };
  document.addEventListener('visibilitychange', refreshWhenVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', refreshWhenVisible);
  };
}, []);

useEffect(() => {
  const fetchProductOptions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/product-options`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load product options');
      const data = await res.json();
      setClothingTypeOptions(data?.data?.clothingTypes || []);
    } catch (err) {
      console.error('[fetchProductOptions] Exception:', err);
      toast.error('Failed to load size and product type options');
    }
  };
  fetchProductOptions();
}, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Variants state for the form
  const [variantsDraft, setVariantsDraft] = useState<VariantDraft[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    clothingType: '',
    availableSizes: [] as string[],
    outfitComponents: [] as OutfitComponent[],
    compareAtPrice: '',
  });

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesBrand = brandFilter === 'all' || product.brand === brandFilter;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in-stock' && product.inStock) ||
      (stockFilter === 'out-of-stock' && !product.inStock);

    return matchesSearch && matchesCategory && matchesBrand && matchesStock;
  });

  const hasActiveFilters = Boolean(
    searchQuery || categoryFilter !== 'all' || brandFilter !== 'all' || stockFilter !== 'all'
  );

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setBrandFilter('all');
    setStockFilter('all');
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price.toString(),
        clothingType: product.clothingType || '',
        availableSizes: product.availableSizes || [],
        outfitComponents: product.outfitComponents || [],
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toString() : '',
      });

      if (product.variants && product.variants.length > 0) {
        setVariantsDraft(
          product.variants.map((v, i) => {
            const vImages = Array.isArray(v.images) ? v.images : [];
            return {
              clientId: v.variantId || `v-exist-${i}`,
              name: v.variantName || 'Default',
              images: vImages.map((img: any) => ({
                id: `ex-${crypto.randomUUID()}`,
                url: typeof img === 'string' ? img : img.imageUrl,
              })),
            };
          })
        );
      } else {
        // Fallback for legacy products
        const legacyImages = product.images?.length > 0 ? product.images : (product.image ? [product.image] : []);
        setVariantsDraft([
          {
            clientId: `v-legacy-${Date.now()}`,
            name: 'Default',
            images: legacyImages.map((url) => ({
              id: `ex-legacy-${crypto.randomUUID()}`,
              url,
            })),
          }
        ]);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        price: '',
        clothingType: '',
        availableSizes: [],
        outfitComponents: [],
        compareAtPrice: '',
      });
      setVariantsDraft([newVariantDraft('Default')]);
    }
    setDialogOpen(true);
  };

  useLayoutEffect(() => {
    if (searchParams.get('action') !== 'add') return;

    returnToDashboardRef.current = searchParams.get('from') === 'dashboard';
    handleOpenDialog();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);

    if (!open && returnToDashboardRef.current) {
      returnToDashboardRef.current = false;
      navigate('/admin');
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim() || !formData.category || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.availableSizes.length === 0) {
      toast.error('Select at least one available footwear size');
      return;
    }

    const totalMedia = variantsDraft.reduce((acc, v) => acc + v.images.length, 0);
    if (totalMedia === 0) {
      toast.error('Please upload at least one product photo or video in your variants');
      return;
    }

    try {
      setIsSaving(true);
      
      // Upload new files for each variant
      const finalizedVariants: ProductVariant[] = [];
      
      for (const variant of variantsDraft) {
        const filesToUpload = variant.images.filter((img) => img.file);
        let uploadedUrls: string[] = [];
        if (filesToUpload.length > 0) {
          const imagesForm = new FormData();
          filesToUpload.forEach((img) => imagesForm.append('images', img.file!));
          
          const uploadRes = await fetch(`${API_BASE_URL}/api/v1/admin/products/upload-images`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: imagesForm,
          });

          const uploadData = await uploadRes.json().catch(() => null);
          if (!uploadRes.ok) {
            const reason = uploadData?.message || `Upload returned status ${uploadRes.status}`;
            toast.error(`Media upload failed for ${variant.name || 'Default'}: ${reason}`);
            setIsSaving(false);
            return;
          }

          uploadedUrls = uploadData?.urls || [];
        }
        
        let uploadIdx = 0;
        const allUrls = variant.images.map((img) => {
          if (img.url) return img.url;
          return uploadedUrls[uploadIdx++];
        }).filter(Boolean);
        
        const imagesPayload = allUrls.map((url, idx) => ({
          imageUrl: url,
          isPrimary: idx === 0,
          sortOrder: idx,
        }));
        
        finalizedVariants.push({
          variantId: variant.clientId.startsWith('v-exist-') ? variant.clientId.replace('v-exist-', '') : (variant.clientId.startsWith('v-') ? variant.clientId : `v-${crypto.randomUUID()}`),
          variantName: variant.name || 'Default',
          images: imagesPayload,
        });
      }

      // Step 2: Save product to database
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || formData.name.trim(),
        brand: editingProduct?.brand || 'Shoe Fashion',
        category: formData.category,
        price: parseFloat(formData.price),
        soldBy: 'piece',
        clothingType: formData.clothingType || null,
        availableSizes: formData.availableSizes,
        outfitComponents: formData.outfitComponents,
        variants: finalizedVariants,
        inStock: editingProduct?.inStock ?? true,
        isActive: true,
        compareAtPrice: parseFloat(formData.compareAtPrice) || 0,
      };

  if (editingProduct) {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/products/${editingProduct.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update product');
    const data = await res.json();
    const updatedProduct = {
      id: data.data._id,
      name: data.data.name,
      brand: typeof data.data.brand === 'object' ? data.data.brand?.name : data.data.brand,
      category: typeof data.data.category === 'object' ? data.data.category?.name : data.data.category,
      price: data.data.price,
      image: data.data.image,
      images: data.data.images || [],
      colors: data.data.colors || [],
      variants: data.data.variants || [],
      description: data.data.description,
      soldBy: data.data.soldBy,
      clothingType: data.data.clothingType || '',
      availableSizes: data.data.availableSizes || [],
      outfitComponents: data.data.outfitComponents || [],
      inStock: data.data.inStock,
      compareAtPrice: data.data.compareAtPrice || 0,
    };
    setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
    toast.success('Product updated successfully');
  } else {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/products`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create product');
    const data = await res.json();
    const newProduct = {
      id: data.data._id,
      name: data.data.name,
      brand: typeof data.data.brand === 'object' ? data.data.brand?.name : data.data.brand,
      category: typeof data.data.category === 'object' ? data.data.category?.name : data.data.category,
      price: data.data.price,
      image: data.data.image,
      images: data.data.images || [],
      colors: data.data.colors || [],
      variants: data.data.variants || [],
      description: data.data.description,
      soldBy: data.data.soldBy,
      clothingType: data.data.clothingType || '',
      availableSizes: data.data.availableSizes || [],
      outfitComponents: data.data.outfitComponents || [],
      inStock: data.data.inStock,
      compareAtPrice: data.data.compareAtPrice || 0,
    };
    setProducts(prev => [newProduct, ...prev]);
    toast.success('Product added successfully');
  }

  handleDialogOpenChange(false);
  setFormData({
    name: '',
    description: '',
    category: '',
    price: '',
    clothingType: '',
    availableSizes: [],
    outfitComponents: [],
    compareAtPrice: '',
  });
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast.success('Product deleted successfully');
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleToggleStock = async (product: Product) => {
    const nextInStock = !product.inStock;
    
    // Optimistic UI update
    setProducts(prev =>
      prev.map(p => (p.id === product.id ? { ...p, inStock: nextInStock } : p))
    );

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/products/${product.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inStock: nextInStock }),
      });

      if (!res.ok) {
        throw new Error('Failed to update stock status in database');
      }

      toast.success(`Stock status updated for ${product.name}`);
    } catch (err) {
      console.error('Error toggling stock status:', err);
      toast.error('Failed to update stock status in database');
      
      // Revert UI update on failure
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, inStock: product.inStock } : p))
      );
    }
  };

  return (
    <div className="products-management space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Catalog</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Products</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Add products, update pricing and control what customers can buy.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button type="button" variant="outline" onClick={() => setProductRefreshKey((key) => key + 1)} disabled={isLoadingProducts} aria-label="Refresh products" className="h-12 flex-1 sm:h-11 sm:flex-none">
            <RefreshCw className={`size-4 ${isLoadingProducts ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="h-12 flex-1 cursor-pointer bg-green-600 px-5 font-bold text-white shadow-md hover:bg-green-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 sm:h-11 sm:flex-none"
          >
            <Plus className="size-5" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="bg-white">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <h2 className="text-sm font-bold text-gray-900">Find products</h2>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-gray-600">
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="space-y-1.5 lg:flex-1">
              <Label htmlFor="product-search" className="text-xs font-semibold text-gray-600">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <Input
                  id="product-search"
                  type="search"
                  placeholder="Search name, brand or category"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 bg-gray-50 pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[31rem]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11 w-full bg-gray-50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Brand</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="h-11 w-full bg-gray-50">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.filter(b => b.name && b.name.toLowerCase() !== 'unknown').map(brand => (
                <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Availability</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="h-11 w-full bg-gray-50">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          <span className="font-bold text-gray-900 dark:text-white">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'product' : 'products'} shown
        </p>
        {hasActiveFilters && <span className="text-xs font-medium text-green-700">Filters applied</span>}
      </div>

      {/* Products Grid/Table */}
      {isLoadingProducts && products.length === 0 ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-gray-500" role="status" aria-live="polite"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Loading products…</CardContent></Card>
      ) : productsLoadError && products.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert"><Package className="size-12 text-gray-400" aria-hidden="true" /><p className="font-medium">Products could not be loaded</p><p className="text-sm text-gray-500">{productsLoadError}</p><Button type="button" variant="outline" onClick={() => setProductRefreshKey((key) => key + 1)}>Try again</Button></CardContent></Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <Package className="size-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden bg-white transition-shadow hover:shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Product Images Strip */}
                  <div className="flex-shrink-0">
                    <div className="flex flex-col gap-1">
                      {/* Primary media */}
                      {isVideoUrl(product.variants?.[0]?.images?.[0]?.imageUrl || product.image || (product.images && product.images[0])) ? (
                        <video
                          src={product.variants?.[0]?.images?.[0]?.imageUrl || product.image || (product.images && product.images[0])}
                          aria-label={`${product.name} video`}
                          className="size-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700 sm:size-20"
                          controls
                          preload="metadata"
                        />
                      ) : <img
                        src={product.variants?.[0]?.images?.[0]?.imageUrl || product.image || (product.images && product.images[0])}
                        alt={product.name}
                        className="size-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700 sm:size-20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjOTk5IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjMiPjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI3MiIgaGVpZ2h0PSI3MiIgcng9IjYiLz48cGF0aCBkPSJtOCA1NiAxNi0yMCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUyIiBjeT0iMzIiIHI9IjgiLz48L3N2Zz4=';
                        }}
                      />}
                      {/* Extra variants/images count badge */}
                      {(product.variants && product.variants.length > 1) ? (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Images className="size-3" />
                          {product.variants.length} variants
                        </div>
                      ) : (product.images && product.images.length > 1) ? (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Images className="size-3" />
                          {product.images.length} media items
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate text-base font-bold text-gray-950 sm:text-lg" title={product.name}>{product.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {product.brand && product.brand.toLowerCase() !== 'unknown' && (
                            <Badge variant="outline" className="text-xs">
                              {product.brand}
                            </Badge>
                          )}
                          {product.category && product.category.toLowerCase() !== 'unknown' && (
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                           {/* Selling unit badge */}
                           <Badge className={product.soldBy === 'meter' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs'}>
                             {product.soldBy === 'meter' ? 'Sold by Meter' : 'Sold by Piece'}
                           </Badge>
                          {product.clothingType ? (
                            <Badge variant="secondary" className="text-xs">
                              {product.clothingType}
                            </Badge>
                          ) : null}
                        </div>
                        {product.availableSizes && product.availableSizes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {product.availableSizes.slice(0, 8).map((size) => (
                              <Badge key={`${product.id}-${size}`} variant="outline" className="text-[10px]">
                                {size}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {/* Price & Stock */}
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 sm:block sm:min-w-36 sm:text-right">
                        <div className="text-2xl font-bold text-gray-950">
                          ₹{product.price}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          per {product.soldBy}
                        </div>

                        <div className="sm:mt-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.inStock}
                              onCheckedChange={() => handleToggleStock(product)}
                              aria-label={`Mark ${product.name} as ${product.inStock ? 'out of stock' : 'in stock'}`}
                            />
                            <Badge className={product.inStock ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs'}>
                              {product.inStock ? 'In Stock' : 'Out'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex sm:items-center sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(product)}
                        className="min-h-10 sm:flex-none sm:px-5"
                      >
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </Button>
                      {/* Copy Link — single variant: copy directly; multi-variant: pick from popover */}
                      {(!product.variants || product.variants.length <= 1) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = buildProductShareUrl(product.id, null, STOREFRONT_URL);
                            navigator.clipboard.writeText(url).then(() => {
                              setCopiedId(product.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            });
                          }}
                          className={`min-h-10 transition-colors sm:flex-none sm:px-5 ${
                            copiedId === product.id
                              ? 'text-emerald-600 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900/30'
                          }`}
                          title="Copy product link to share"
                        >
                          {copiedId === product.id ? (
                            <><Check className="size-4 mr-1" /> Copied!</>
                          ) : (
                            <><Link className="size-4 mr-1" /> Copy Link</>
                          )}
                        </Button>
                      ) : (
                        <Popover
                          open={popoverProductId === product.id}
                          onOpenChange={(open) => setPopoverProductId(open ? product.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900/30 sm:flex-none sm:px-5"
                              title="Copy variant link to share"
                            >
                              <Link className="size-4 mr-1" /> Copy Link
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">Pick a variant to copy its link:</p>
                            <div className="space-y-1">
                              {/* All variants option */}
                              <button
                                onClick={() => {
                                  const url = buildProductShareUrl(product.id, null, STOREFRONT_URL);
                                  navigator.clipboard.writeText(url).then(() => {
                                    setCopiedId(`${product.id}-all`);
                                    setTimeout(() => { setCopiedId(null); setPopoverProductId(null); }, 1800);
                                  });
                                }}
                                className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md hover:bg-muted text-sm transition-colors"
                              >
                                {copiedId === `${product.id}-all` ? (
                                  <Check className="size-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Link className="size-3.5 text-muted-foreground shrink-0" />
                                )}
                                <span className="truncate font-medium">All variants (main link)</span>
                              </button>
                              {/* Per-variant options */}
                              {product.variants!.map((variant) => (
                                <button
                                  key={variant.variantId}
                                  onClick={() => {
                                    const url = buildProductShareUrl(product.id, variant.variantId, STOREFRONT_URL);
                                    navigator.clipboard.writeText(url).then(() => {
                                      setCopiedId(`${product.id}-${variant.variantId}`);
                                      setTimeout(() => { setCopiedId(null); setPopoverProductId(null); }, 1800);
                                    });
                                  }}
                                  className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md hover:bg-muted text-sm transition-colors"
                                >
                                  {copiedId === `${product.id}-${variant.variantId}` ? (
                                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    variant.images?.[0]?.imageUrl ? (
                                      <ProductMediaPreview
                                        src={variant.images[0].imageUrl}
                                        name={variant.variantName}
                                        className="size-5 rounded object-cover shrink-0"
                                      />
                                    ) : (
                                      <Link className="size-3.5 text-muted-foreground shrink-0" />
                                    )
                                  )}
                                  <span className="truncate">{variant.variantName}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(product)}
                        className="col-span-2 min-h-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30 sm:col-span-1 sm:flex-none sm:px-5"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-0 p-4 pb-24 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:gap-4 sm:rounded-lg sm:border sm:p-6"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the product details below' : 'Fill in the details to add a new product'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-5 sm:space-y-4 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Classic Block Heel"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1399"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">MRP (₹)</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  value={formData.compareAtPrice}
                  onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                  placeholder="1799"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clothingType">Footwear type</Label>
                <Select
                  value={formData.clothingType || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clothingType: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger id="clothingType">
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {clothingTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Product Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the shoe material, fit, heel height, sole, and styling."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Shown in the Product details section. If left blank, the product name is used.</p>
            </div>

            <div className="space-y-2">
              <Label>Colours, Photos & Videos *</Label>
              <p className="text-xs text-muted-foreground">Add one entry for each colour or style. The first photo becomes its storefront preview.</p>
              <VariantManager variants={variantsDraft} onChange={setVariantsDraft} />
            </div>

            <fieldset className="space-y-3 rounded-md border p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <legend className="text-sm font-medium">Available sizes *</legend>
                      <p className="mt-1 text-xs text-muted-foreground">EU footwear sizes saved exactly as shown on the Shoe Fashion storefront.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData((current) => ({
                    ...current,
                    availableSizes: current.availableSizes.length === FOOTWEAR_SIZES.length ? [] : [...FOOTWEAR_SIZES],
                  }))}
                >
                  {formData.availableSizes.length === FOOTWEAR_SIZES.length ? 'Clear' : 'Select all'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                {FOOTWEAR_SIZES.map((size) => {
                  const checked = formData.availableSizes.includes(size);
                  const inputId = `footwear-size-${size}`;
                  return (
                    <label key={size} htmlFor={inputId} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors ${checked ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted'}`}>
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={(nextChecked) => setFormData((current) => ({
                          ...current,
                          availableSizes: nextChecked
                            ? [...current.availableSizes, size].sort((a, b) => Number(a) - Number(b))
                            : current.availableSizes.filter((item) => item !== size),
                        }))}
                      />
                      <span>{size}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                {formData.availableSizes.length} of {FOOTWEAR_SIZES.length} sizes selected
              </p>
            </fieldset>

          </div>

          <DialogFooter className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="h-12 w-full bg-amber-400 font-bold text-gray-950 hover:bg-amber-500 sm:h-10 sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Product'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
