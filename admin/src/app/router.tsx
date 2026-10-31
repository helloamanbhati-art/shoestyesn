import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedAdminRoute } from './components/admin/ProtectedAdminRoute';
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { ProductsManagement } from './pages/admin/ProductsManagement';
import { OrdersManagement } from './pages/admin/OrdersManagement';
import { CategoriesManagement } from './pages/admin/CategoriesManagement';
import { CustomersManagement } from './pages/admin/CustomersManagement';
import { ProductOptionsManagement } from './pages/admin/ProductOptionsManagement';
import { StorefrontSettings } from './pages/admin/StorefrontSettings';

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
      { path: 'brands', element: <Navigate to="/admin/footwear-types" replace /> },
      {
        path: 'categories',
        element: <CategoriesManagement />,
      },
      {
        path: 'customers',
        element: <CustomersManagement />,
      },
      {
        path: 'footwear-types',
        element: <ProductOptionsManagement />,
      },
      { path: 'product-options', element: <Navigate to="/admin/footwear-types" replace /> },
      {
        path: 'storefront-settings',
        element: <StorefrontSettings />,
      },
    ],
  },

  { path: '*', element: <Navigate to="/admin" replace /> },
]);

export default router;
