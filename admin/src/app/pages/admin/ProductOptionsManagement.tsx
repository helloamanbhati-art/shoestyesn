import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminRequest } from '../../api/client';

const EU_FOOTWEAR_SIZES = ['35', '36', '37', '38', '39', '40', '41'];

export function ProductOptionsManagement() {
  const [sizes] = useState<string[]>(EU_FOOTWEAR_SIZES);
  const [clothingTypes, setClothingTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await adminRequest<{ clothingTypes?: string[] }>('/api/v1/admin/product-options');
        setClothingTypes(data?.clothingTypes || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load product options');
      }
    };

    fetchOptions();
  }, []);

  const addUniqueValue = (
    value: string,
    list: string[],
    setList: (next: string[]) => void,
    clearInput: () => void
  ) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    const alreadyExists = list.some((item) => item.toLowerCase() === cleaned.toLowerCase());
    if (alreadyExists) {
      toast.error('Already exists');
      return;
    }
    setList([...list, cleaned]);
    clearInput();
  };

  const removeByIndex = (index: number, list: string[], setList: (next: string[]) => void) => {
    setList(list.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminRequest('/api/v1/admin/product-options', {
        method: 'PUT',
        body: JSON.stringify({ sizes, clothingTypes }),
      });
      toast.success('Product options saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Options</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage EU footwear sizes and product types for admin products and customer filters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sizes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Only these EU sizes can be assigned to footwear products.</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <Badge key={size} variant="secondary">EU {size}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footwear Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Add type (e.g. heels, flats, sneakers)"
            />
            <Button
              type="button"
              onClick={() =>
                addUniqueValue(newType, clothingTypes, setClothingTypes, () => setNewType(''))
              }
            >
              <Plus className="size-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {clothingTypes.map((type, index) => (
              <Badge key={`${type}-${index}`} variant="outline" className="gap-1">
                {type}
                <button
                  type="button"
                  onClick={() => removeByIndex(index, clothingTypes, setClothingTypes)}
                  aria-label="Remove product type"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Options'}
        </Button>
      </div>
    </div>
  );
}
