import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { Toaster } from './components/ui/sonner';
import { ProductProvider } from './contexts/ProductContext';
import { CartProvider } from './contexts/CartContext';
import { OrderProvider } from './contexts/OrderContext';
import { AuthProvider } from './contexts/AuthContext';
import { MobileLoginDialog } from './components/auth/MobileLoginDialog';

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <OrderProvider>
            <RouterProvider router={router} />
            <MobileLoginDialog />
            <Toaster />
          </OrderProvider>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
