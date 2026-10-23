import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';

const products = [
  { id: '1', name: 'Classic Block Heels', brand: 'Shoe Fashion', price: 899, soldBy: 'piece', stock: 45, category: 'Heels', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400' },
  { id: '2', name: 'Everyday Ballet Flats', brand: 'Shoe Fashion', price: 699, soldBy: 'piece', stock: 30, category: 'Flats', image: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=400' },
  { id: '3', name: 'Street Court Sneakers', brand: 'Shoe Fashion', price: 1099, soldBy: 'piece', stock: 60, category: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { id: '4', name: 'Strappy Evening Sandals', brand: 'Shoe Fashion', price: 999, soldBy: 'piece', stock: 35, category: 'Sandals', image: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=400' },
];

export function Products() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your footwear and accessories inventory</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input placeholder="Search products..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="size-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Brand</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Price</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="size-12 rounded-lg object-cover" />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{typeof product.brand === 'object' ? product.brand?.name : product.brand}</td>
                    <td className="py-3 px-4 font-medium">₹{product.price}</td>
                    <td className="py-3 px-4">
                      <Badge className={product.stock > 20 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}>
                        {product.stock} in stock
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{typeof product.category === 'object' ? product.category?.name : product.category}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
