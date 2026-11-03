import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { Layout } from './pages/Layout';
import { Home } from './pages/Home';
import { ProductionErrorScreen } from './components/ErrorBoundary';

const ProductDetail = lazy(() => import('./pages/ProductDetail').then((module) => ({ default: module.ProductDetail })));
const CategoryProducts = lazy(() => import('./pages/CategoryProducts').then((module) => ({ default: module.CategoryProducts })));
const Cart = lazy(() => import('./pages/Cart').then((module) => ({ default: module.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then((module) => ({ default: module.Checkout })));
const Payment = lazy(() => import('./pages/Payment').then((module) => ({ default: module.Payment })));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess').then((module) => ({ default: module.OrderSuccess })));
const MyOrders = lazy(() => import('./pages/MyOrders').then((module) => ({ default: module.MyOrders })));
const OrderDetail = lazy(() => import('./pages/OrderDetail').then((module) => ({ default: module.OrderDetail })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));
const StoreInformation = lazy(() => import('./pages/StoreInformation').then((module) => ({ default: module.StoreInformation })));

function PageLoadingState() {
  return (
    <div className="min-h-[70vh] bg-white px-4 py-10 text-[#0A0A0A]" role="status" aria-live="polite" aria-busy="true">
      <div className="mx-auto max-w-[1600px]">
        <p className="text-sm font-semibold">Loading the collection…</p>
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-6 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[3/4] bg-neutral-100" />
              <div className="mt-3 h-3 w-3/4 bg-neutral-100" />
              <div className="mt-2 h-3 w-1/3 bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function deferred(page: ReactNode) {
  return <Suspense fallback={<PageLoadingState />}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ProductionErrorScreen />,
    children: [
      { 
        index: true, 
        element: <Home /> 
      },
      { 
        path: 'product/:id', 
        element: deferred(<ProductDetail />)
      },
      {
        path: 'category/:category',
        element: deferred(<CategoryProducts />)
      },
      {
        path: 'products',
        element: deferred(<CategoryProducts />)
      },
      { 
        path: 'cart', 
        element: deferred(<Cart />)
      },
      { 
        path: 'checkout', 
        element: deferred(<Checkout />)
      },
      { 
        path: 'payment', 
        element: deferred(<Payment />)
      },
      { 
        path: 'order-success', 
        element: deferred(<OrderSuccess />)
      },
      { 
        path: 'my-orders', 
        element: deferred(<MyOrders />)
      },
      { 
        path: 'order/:id', 
        element: deferred(<OrderDetail />)
      },
      { 
        path: 'privacy-policy', 
        element: deferred(<PrivacyPolicy />)
      },
      {
        path: 'about-us',
        element: deferred(<StoreInformation />)
      },
      {
        path: 'contact-us',
        element: deferred(<StoreInformation />)
      },
      {
        path: 'size-guide',
        element: deferred(<StoreInformation />)
      },
      {
        path: 'shipping-delivery',
        element: deferred(<StoreInformation />)
      },
      { 
        path: '*', 
        element: deferred(<NotFound />)
      },
    ],
  },
]);
