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
const socialLogoAsset = readFileSync(
  new URL('../public/shoe-style-logo.png', import.meta.url),
);

test('storefront uses SVG on the page and a crawlable PNG in link previews', () => {
  assert.match(logoAsset, /<svg\b/);
  assert.deepEqual([...socialLogoAsset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.match(logoComponent, /\/shoe-style-logo\.svg/);
  assert.match(indexHtml, /rel="icon" type="image\/svg\+xml" href="\/shoe-style-logo\.svg"/);
  assert.match(indexHtml, /property="og:image" content="https:\/\/shoefashion\.in\/shoe-style-logo\.png\?v=2"/);
  assert.match(indexHtml, /property="og:image:type" content="image\/png"/);
  assert.match(indexHtml, /property="og:image:width" content="2172"/);
  assert.match(indexHtml, /property="og:image:height" content="724"/);
  assert.match(indexHtml, /name="twitter:image" content="https:\/\/shoefashion\.in\/shoe-style-logo\.png\?v=2"/);
  assert.match(paymentPage, /\/shoe-style-logo\.svg/);
});

test('storefront links expose title, description, and canonical URL', () => {
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/shoefashion\.in\/" \/>/);
  assert.match(indexHtml, /property="og:title" content="Shoe Style \| Footwear in Sarojini Nagar"/);
  assert.match(indexHtml, /property="og:description" content="Shop footwear in sizes 35 to 41/);
  assert.match(indexHtml, /property="og:url" content="https:\/\/shoefashion\.in\/"/);
});
