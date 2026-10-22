import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { OrderProvider } from './contexts/OrderContext';
import { BrandProvider } from './contexts/BrandContext';
import { CategoryProvider } from './contexts/CategoryContext';
import router from './router';
import { AdminAuthProvider } from './contexts/AdminAuthContext';

export default function App() {
  return (
    <AdminAuthProvider>
    <ThemeProvider>
      <BrandProvider>
        <CategoryProvider>
          <OrderProvider>
                <Toaster position="top-right" />
                <RouterProvider router={router} />
          </OrderProvider>
        </CategoryProvider>
      </BrandProvider>
    </ThemeProvider>
    </AdminAuthProvider>
  );
}
