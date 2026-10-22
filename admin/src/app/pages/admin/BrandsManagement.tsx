import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, Tag, TrendingUp } from 'lucide-react';
import { useBrands } from '../../contexts/BrandContext';
import { toast } from 'sonner';

export function BrandsManagement() {
  const { brands, loading, error, addBrand, updateBrand, deleteBrand } = useBrands();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<typeof brands[0] | null>(null);
  const [brandName, setBrandName] = useState('');

  const totalProducts = brands.reduce((sum, brand) => sum + (brand.productCount || 0), 0);
  const averageProducts = brands.length > 0 ? Math.round(totalProducts / brands.length) : 0;

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500 dark:text-gray-400">
        Loading brands...
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-red-600 dark:text-red-400">
          <p className="text-lg font-semibold">Unable to load brands</p>
          <p className="mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const handleOpenDialog = (brand?: typeof brands[0]) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandName(brand.name);
    } else {
      setEditingBrand(null);
      setBrandName('');
    }
    setDialogOpen(true);
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim() || brandName.trim().length < 2) {
      toast.error('Brand name must be at least 2 characters');
      return;
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = brands.some(
      (b) => b.name.toLowerCase() === brandName.trim().toLowerCase() && b.id !== editingBrand?.id
    );

    if (isDuplicate) {
      toast.error('A brand with this name already exists');
      return;
    }

    let success: boolean;
    if (editingBrand) {
      success = await updateBrand(editingBrand.id, { ...editingBrand, name: brandName.trim() });
      if (success) {
        toast.success('Brand updated successfully');
      } else {
        toast.error('Failed to update brand');
        return;
      }
    } else {
      success = await addBrand({
        id: Date.now().toString(),
        name: brandName.trim(),
        productCount: 0,
      });
      if (success) {
        toast.success('Brand added successfully');
      } else {
        toast.error('Failed to add brand');
        return;
      }
    }

    setDialogOpen(false);
    setBrandName('');
  };

  const handleDeleteBrand = async (brand: typeof brands[0]) => {
    if (window.confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      const success = await deleteBrand(brand.id);
      if (success) {
        toast.success('Brand deleted successfully');
      } else {
        toast.error('Failed to delete brand');
      }
    }
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="brands-management space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 border-b border-gray-200 pb-4 sm:pb-5">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Catalog</p>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Brands Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total {brands.length} brands
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="h-11 shrink-0 rounded-none bg-green-600 px-4 font-bold text-white shadow-sm hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" />
          Add Brand
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 border border-gray-200 bg-white" aria-label="Brand summary">
        <Card className="min-h-[7rem] rounded-none border-0 border-r shadow-none">
          <CardContent className="flex h-full flex-col justify-between p-3 sm:p-5">
            <Tag className="size-5 text-green-700" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold leading-none sm:text-2xl">{brands.length}</p>
              <p className="mt-2 text-[11px] font-medium leading-tight text-gray-600 sm:text-sm">Brands</p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[7rem] rounded-none border-0 border-r shadow-none">
          <CardContent className="flex h-full flex-col justify-between p-3 sm:p-5">
            <TrendingUp className="size-5 text-green-700" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold leading-none sm:text-2xl">{totalProducts}</p>
              <p className="mt-2 text-[11px] font-medium leading-tight text-gray-600 sm:text-sm">Products</p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[7rem] rounded-none border-0 shadow-none">
          <CardContent className="flex h-full flex-col justify-between p-3 sm:p-5">
            <TrendingUp className="size-5 text-green-700" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold leading-none sm:text-2xl">{averageProducts}</p>
              <p className="mt-2 text-[11px] font-medium leading-tight text-gray-600 sm:text-sm">Avg / brand</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brands Grid */}
      {brands.length === 0 ? (
        <Card className="rounded-none">
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <Tag className="mb-3 size-10 opacity-50" />
              <p className="text-lg font-medium">No brands found</p>
              <p className="text-sm">Click "Add Brand" to create your first brand</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {brands.map((brand) => (
            <Card key={brand.id} className="rounded-none bg-white shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-none bg-gray-950 text-lg font-bold text-white">
                    {getInitial(brand.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="truncate text-base font-bold">{brand.name}</h2>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {brand.productCount || 0} products
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(brand)}
                    className="size-10 shrink-0 rounded-none"
                    aria-label={`Edit ${brand.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBrand(brand)}
                    className="size-10 shrink-0 rounded-none text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                    aria-label={`Delete ${brand.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
            <DialogDescription>
              {editingBrand ? 'Update the brand name below' : 'Enter the name for the new brand'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                className="rounded-none"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Fabindia"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveBrand()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBrand}
              className="rounded-none bg-green-600 font-bold text-white hover:bg-green-700"
            >
              Save Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
