const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const { buildProductSharePage } = require('../src/services/productSharePage');

test('share redirects default to the public Shoe Fashion storefront domain', () => {
  const controllerSource = readFileSync(join(__dirname, '../src/controllers/shareController.js'), 'utf8');
  assert.match(controllerSource, /https:\/\/shoefashion\.in/);
  assert.doesNotMatch(controllerSource, /amanbhati\.vercel\.app/);
});

test('product share page includes rich preview metadata and opens the exact product', () => {
  const html = buildProductSharePage({
    product: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Green Co-ord Set',
      shortDescription: 'Premium festive outfit',
      price: 2499,
      image: 'https://images.example.com/green.jpg',
      variants: [],
    },
    storefrontUrl: 'https://shop.example.com',
  });

  assert.match(html, /property="og:title" content="Green Co-ord Set \| Shoe Fashion"/);
  assert.match(html, /property="og:image" content="https:\/\/images\.example\.com\/green\.jpg"/);
  assert.match(html, /property="product:price:amount" content="2499"/);
  assert.match(html, /url=https:\/\/shop\.example\.com\/product\/507f1f77bcf86cd799439011/);
});

test('product share page uses the selected variant image and escapes catalog text', () => {
  const html = buildProductSharePage({
    product: {
      _id: '507f1f77bcf86cd799439011',
      name: '<script>alert("x")</script>',
      description: 'Fresh & festive',
      price: 1999,
      image: 'https://images.example.com/main.jpg',
      variants: [{
        variantId: 'gold',
        variantName: 'Gold',
        images: [{ imageUrl: 'https://images.example.com/gold.jpg', isPrimary: true }],
      }],
    },
    variantId: 'gold',
    storefrontUrl: 'https://shop.example.com',
  });

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /property="og:image" content="https:\/\/images\.example\.com\/gold\.jpg"/);
  assert.match(html, /product\/507f1f77bcf86cd799439011\?variant=gold/);
});

test('product share page skips video media when choosing the preview image', () => {
  const html = buildProductSharePage({
    product: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Video-first outfit',
      description: 'Includes a product video and photos',
      price: 1099,
      image: 'https://images.example.com/fallback.jpg',
      variants: [{
        variantId: 'default',
        variantName: 'Default',
        images: [
          { imageUrl: 'https://images.example.com/look.mp4', isPrimary: true },
          { imageUrl: 'https://images.example.com/look.jpg', isPrimary: false },
        ],
      }],
    },
    variantId: 'default',
    storefrontUrl: 'https://shop.example.com',
  });

  assert.match(html, /property="og:image" content="https:\/\/images\.example\.com\/look\.jpg"/);
  assert.doesNotMatch(html, /property="og:image" content="[^"]+\.mp4/);
});
