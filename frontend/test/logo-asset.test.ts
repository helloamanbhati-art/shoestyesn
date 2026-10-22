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

test('storefront logo references use the deployable SVG asset', () => {
  assert.match(logoAsset, /<svg\b/);
  assert.match(logoComponent, /\/shoe-style-logo\.svg/);
  assert.doesNotMatch(indexHtml, /shoe-style-logo\.png/);
  assert.match(indexHtml, /shoe-style-logo\.svg/);
  assert.match(indexHtml, /og:image:type" content="image\/svg\+xml"/);
  assert.match(paymentPage, /\/shoe-style-logo\.svg/);
});
