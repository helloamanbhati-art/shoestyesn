import { FilterSidebar } from '../components/FilterSidebar';
import { MobileCategoryNav } from '../components/MobileCategoryNav';
import { ProductGrid } from '../components/ProductGrid';
import { useProductFilters } from '../hooks/useProductFilters';
import { useProductContext } from '../contexts/ProductContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

export function Home() {
  usePageTitle();
  const { products, categories, loading, error } = useProductContext();
  const {
    filters,
    setFilters,
    priceRanges,
    filteredProducts,
    brandCounts,
    categoryCounts,
    sizeCounts,
    clothingTypeCounts,
    resetFilters
  } = useProductFilters(products, categories);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleToggle = () => setIsFilterOpen(prev => !prev);
    window.addEventListener('toggle-filters', handleToggle);
    return () => window.removeEventListener('toggle-filters', handleToggle);
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');

    setFilters((current) => ({
      ...current,
      selectedCategories: category ? [category] : [],
    }));
  }, [searchParams, setFilters]);

  const isSaleView = searchParams.get('sale') === 'true';
  const selectedCategory = searchParams.get('category') || undefined;
  const visibleProducts = isSaleView
    ? filteredProducts.filter((product) => product.compareAtPrice && product.compareAtPrice > product.price)
    : filteredProducts;

  const handleMobileCategorySelect = (category?: string) => {
    if (category) {
      navigate(`/?category=${encodeURIComponent(category)}`);
      return;
    }

    navigate('/?view=all');
  };

  return (
    <div className="flex h-[calc(100vh-73px)] flex-col md:flex-row">
      {/* Filter Sidebar */}
      <FilterSidebar
        filters={filters}
        onFiltersChange={setFilters}
        priceRanges={priceRanges}
        brandCounts={brandCounts}
        categoryCounts={categoryCounts}
        sizeCounts={sizeCounts}
        clothingTypeCounts={clothingTypeCounts}
        onResetFilters={resetFilters}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
      
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!loading && !error && (
          <MobileCategoryNav
            categories={categoryCounts}
            selectedCategory={selectedCategory}
            totalCount={products.length}
            onSelect={handleMobileCategorySelect}
          />
        )}
        {error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <p className="mb-4 font-semibold text-red-700">Failed to load products</p>
              <p className="text-gray-600 dark:text-gray-300">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center" role="status" aria-label="Loading products">
            <Loader2 className="size-8 animate-spin text-[#3145a5]" />
          </div>
        ) : (
          <ProductGrid products={visibleProducts} />
        )}
      </div>
    </div>
  );
}
