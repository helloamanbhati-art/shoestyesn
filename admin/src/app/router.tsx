import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedAdminRoute } from './components/admin/ProtectedAdminRoute';
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { ProductsManagement } from './pages/admin/ProductsManagement';
import { OrdersManagement } from './pages/admin/OrdersManagement';
import { BrandsManagement } from './pages/admin/BrandsManagement';
import { CategoriesManagement } from './pages/admin/CategoriesManagement';
import { CustomersManagement } from './pages/admin/CustomersManagement';
import { ProductOptionsManagement } from './pages/admin/ProductOptionsManagement';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },

  // Admin routes
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin',
    element: <ProtectedAdminRoute />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'analytics',
        element: <AdminAnalytics />,
      },
      {
        path: 'products',
        element: <ProductsManagement />,
      },
      {
        path: 'orders',
        element: <OrdersManagement />,
      },
      {
        path: 'brands',
        element: <BrandsManagement />,
      },
      {
        path: 'categories',
        element: <CategoriesManagement />,
      },
      {
        path: 'customers',
        element: <CustomersManagement />,
      },
      {
        path: 'product-options',
        element: <ProductOptionsManagement />,
      },
    ],
  },

  { path: '*', element: <Navigate to="/admin" replace /> },
]);

export default router;
