import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminRequest } from '../../api/client';

const EU_FOOTWEAR_SIZES = ['35', '36', '37', '38', '39', '40', '41'];
const DEFAULT_FOOTWEAR_TYPES = [
  'Sneakers', 'Flats', 'Sandals', 'Heels', 'Wedges',
  'Loafers', 'Mules', 'Slippers', 'Ankle Boots', 'Knee Boots',
];
const LEGACY_APPAREL_TYPES = new Set(['shirt', 'jeans', 'dress', 'kurti', 'saree', 'women', 'men']);

export function ProductOptionsManagement() {
  const [sizes] = useState<string[]>(EU_FOOTWEAR_SIZES);
  const [clothingTypes, setClothingTypes] = useState<string[]>(DEFAULT_FOOTWEAR_TYPES);
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await adminRequest<{ clothingTypes?: string[] }>('/api/v1/admin/product-options');
        const savedTypes = data?.clothingTypes || [];
        const containsLegacyApparel = savedTypes.some((type) => LEGACY_APPAREL_TYPES.has(type.toLowerCase()));
        setClothingTypes(savedTypes.length && !containsLegacyApparel ? savedTypes : DEFAULT_FOOTWEAR_TYPES);
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

  const updateTypeAtIndex = (index: number, value: string) => {
    setClothingTypes((current) => current.map((type, idx) => (idx === index ? value : type)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const cleanedTypes = clothingTypes.map((type) => type.trim()).filter(Boolean);
      if (new Set(cleanedTypes.map((type) => type.toLowerCase())).size !== cleanedTypes.length) {
        toast.error('Each footwear type must be unique');
        return;
      }
      await adminRequest('/api/v1/admin/product-options', {
        method: 'PUT',
        body: JSON.stringify({ sizes, clothingTypes: cleanedTypes }),
      });
      setClothingTypes(cleanedTypes);
      toast.success('Footwear types saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Footwear Types</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add, rename, or remove the footwear types available when managing products.
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
              <span key={size} className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold">EU {size}</span>
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
              placeholder="Add type (e.g. Heels, Flats, Sneakers)"
              aria-label="Add footwear type"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addUniqueValue(newType, clothingTypes, setClothingTypes, () => setNewType(''));
                }
              }}
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
          <div className="space-y-2">
            {clothingTypes.map((type, index) => (
              <div key={index} className="flex items-center gap-2">
                <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={type}
                  onChange={(event) => updateTypeAtIndex(index, event.target.value)}
                  aria-label={`Edit ${type}`}
                />
                <button
                  type="button"
                  onClick={() => removeByIndex(index, clothingTypes, setClothingTypes)}
                  aria-label={`Remove ${type}`}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Footwear Types'}
        </Button>
      </div>
    </div>
  );
}
