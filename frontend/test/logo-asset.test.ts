import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const logoComponent = readFileSync(
  new URL('../src/app/components/ShoeStyleLogo.tsx', import.meta.url),
  'utf8',
);
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const paymentPage = readFileSync(
  new URL('../src/app/pages/Payment.tsx', import.meta.url),
  'utf8',
);
const logoAsset = readFileSync(
  new URL('../public/shoe-style-logo.svg', import.meta.url),
  'utf8',
);

test('storefront uses the deploy-safe SVG everywhere the primary logo appears', () => {
  assert.match(logoAsset, /^<svg\b/);
  assert.match(logoComponent, /\/shoe-style-logo\.svg/);
  assert.match(indexHtml, /rel="icon" type="image\/svg\+xml" href="\/shoe-style-logo\.svg"/);
  assert.match(indexHtml, /property="og:image" content="https:\/\/shoefashion\.in\/shoe-style-logo\.svg\?v=5"/);
  assert.match(indexHtml, /property="og:image:type" content="image\/svg\+xml"/);
  assert.match(indexHtml, /property="og:image:width" content="854"/);
  assert.match(indexHtml, /property="og:image:height" content="190"/);
  assert.match(indexHtml, /name="twitter:image" content="https:\/\/shoefashion\.in\/shoe-style-logo\.svg\?v=5"/);
  assert.match(paymentPage, /\/shoe-style-logo\.svg/);
});

test('storefront links expose title, description, and canonical URL', () => {
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/shoefashion\.in\/" \/>/);
  assert.match(indexHtml, /property="og:title" content="Shoe Style \| Footwear in Sarojini Nagar"/);
  assert.match(indexHtml, /property="og:description" content="Shop footwear in sizes 35 to 41/);
  assert.match(indexHtml, /property="og:url" content="https:\/\/shoefashion\.in\/"/);
});
