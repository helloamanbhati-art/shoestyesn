import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storefrontFiles = [
  '../src/styles/globals.css',
  '../src/app/pages/Home.tsx',
  '../src/app/pages/Layout.tsx',
  '../src/app/pages/CategoryProducts.tsx',
  '../src/app/pages/Wishlist.tsx',
  '../src/app/pages/ProductDetail.tsx',
  '../src/app/components/Navbar.tsx',
  '../src/app/components/ProductCard.tsx',
  '../src/app/components/ShoeStyleLogo.tsx',
  '../src/app/components/ImageCarousel.tsx',
  '../src/app/components/PaymentModals.tsx',
  '../src/app/components/ErrorBoundary.tsx',
  '../src/app/pages/MyOrders.tsx',
  '../src/app/pages/OrderSuccess.tsx',
  '../src/app/pages/Payment.tsx',
];

const coloredHex = /#(?:E21B2D|F15A32|6f1d2b|3145a5|d4183d)/i;
const coloredUtility = /(?:text|bg|border|ring|accent)-(?:red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/;

test('primary storefront surfaces use a monochrome theme', () => {
  for (const file of storefrontFiles) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, coloredHex, `${file} contains a colored hex accent`);
    assert.doesNotMatch(source, coloredUtility, `${file} contains a colored utility class`);
  }
});

test('the monochrome interface does not desaturate images or the logo', () => {
  const imageSources = [
    readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/app/components/ShoeStyleLogo.tsx', import.meta.url), 'utf8'),
  ].join('\n');
  assert.doesNotMatch(imageSources, /grayscale/);
});
