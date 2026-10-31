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
import { Plus, Pencil, Trash2, Layers, Package, TrendingUp } from 'lucide-react';
import { useCategories } from '../../contexts/CategoryContext';
import { toast } from 'sonner';

export function CategoriesManagement() {
  const { categories, loading, error, reloadCategories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<typeof categories[0] | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const totalProducts = categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0);
  const averageProducts = categories.length > 0 ? Math.round(totalProducts / categories.length) : 0;

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500 dark:text-gray-400">
        Loading categories...
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-red-600 dark:text-red-400">
          <p className="text-lg font-semibold">Unable to load categories</p>
          <p className="mt-2">{error}</p>
          <Button className="mt-5" onClick={() => void reloadCategories()}>
            Retry loading categories
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleOpenDialog = (category?: typeof categories[0]) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase() && c.id !== editingCategory?.id
    );

    if (isDuplicate) {
      toast.error('A category with this name already exists');
      return;
    }

    let success: boolean;
    if (editingCategory) {
      success = await updateCategory(editingCategory.id, { ...editingCategory, name: categoryName.trim() });
      if (success) {
        toast.success('Category updated successfully');
      } else {
        toast.error('Failed to update category');
        return;
      }
    } else {
      success = await addCategory({
        id: Date.now().toString(),
        name: categoryName.trim(),
        productCount: 0,
      });
      if (success) {
        toast.success('Category added successfully');
      } else {
        toast.error('Failed to add category');
        return;
      }
    }

    setDialogOpen(false);
    setCategoryName('');
  };

  const handleDeleteCategory = async (category: typeof categories[0]) => {
    const hasProducts = (category.productCount || 0) > 0;
    const message = hasProducts
      ? `"${category.name}" has ${category.productCount} products assigned to it. Are you sure you want to delete this category?`
      : `Are you sure you want to delete "${category.name}"?`;

    if (window.confirm(message)) {
      const success = await deleteCategory(category.id);
      if (success) {
        toast.success('Category deleted successfully');
      } else {
        toast.error('Failed to delete category');
      }
    }
  };

  return (
    <div className="categories-management space-y-4 sm:space-y-6">
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          <span>Showing the last loaded categories while the server reconnects.</span>
          <Button variant="outline" size="sm" onClick={() => void reloadCategories()}>Retry</Button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-end justify-between gap-3 border-b border-gray-200 pb-4 sm:pb-5">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Catalog</p>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Categories Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total {categories.length} categories
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="h-11 shrink-0 rounded-none bg-green-600 px-4 font-bold text-white shadow-sm hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 border border-gray-200 bg-white" aria-label="Category summary">
        <Card className="min-h-[7rem] rounded-none border-0 border-r shadow-none">
          <CardContent className="flex h-full flex-col justify-between p-3 sm:p-5">
            <Layers className="size-5 text-green-700" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold leading-none sm:text-2xl">{categories.length}</p>
              <p className="mt-2 text-[11px] font-medium leading-tight text-gray-600 sm:text-sm">Categories</p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[7rem] rounded-none border-0 border-r shadow-none">
          <CardContent className="flex h-full flex-col justify-between p-3 sm:p-5">
            <Package className="size-5 text-green-700" aria-hidden="true" />
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
              <p className="mt-2 text-[11px] font-medium leading-tight text-gray-600 sm:text-sm">Avg / category</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card className="rounded-none">
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Layers className="mb-3 size-10 opacity-50" />
              <p className="text-lg font-medium">No categories found</p>
              <p className="text-sm">Click "Add Category" to create your first category</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="rounded-none bg-white shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-none bg-gray-950 text-white">
                    <Layers className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold">{category.name}</h2>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {category.productCount || 0} products
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)} className="size-10 shrink-0 rounded-none" aria-label={`Edit ${category.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)} className="size-10 shrink-0 rounded-none text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20" aria-label={`Delete ${category.name}`}>
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
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category name below' : 'Enter the name for the new category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                className="rounded-none"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Heels, Flats, Sneakers"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              className="rounded-none bg-green-600 font-bold text-white hover:bg-green-700"
            >
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
