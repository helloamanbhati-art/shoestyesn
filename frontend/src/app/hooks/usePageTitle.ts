import { useEffect } from 'react';
import { useLocation } from 'react-router';

const pagesTitleMap: Record<string, string> = {
  '/': 'Shoe Style | Footwear in Sarojini Nagar',
  '/cart': 'Shopping Cart - Shoe Style',
  '/checkout': 'Checkout - Shoe Style',
  '/payment': 'Payment - Shoe Style',
  '/order-success': 'Order Success - Shoe Style',
  '/my-orders': 'My Orders - Shoe Style',
  '/privacy-policy': 'Privacy Policy - Shoe Style',
  '/product': 'Product - Shoe Style',
};

export function usePageTitle(title?: string) {
  const location = useLocation();

  useEffect(() => {
    let pageTitle = 'Shoe Style';

    if (title) {
      pageTitle = `${title} - Shoe Style`;
    } else {
      // Check for exact path match
      pageTitle = pagesTitleMap[location.pathname] || 'Shoe Style';

      // Check for dynamic routes like /product/:id
      if (location.pathname.startsWith('/product/')) {
        pageTitle = pagesTitleMap['/product'] || 'Product - Shoe Style';
      }
      if (location.pathname.startsWith('/order/')) {
        pageTitle = 'Order Details - Shoe Style';
      }
    }

    document.title = pageTitle;
  }, [location.pathname, title]);
}
