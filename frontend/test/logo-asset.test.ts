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
  new URL('../public/shoe-style-logo.png', import.meta.url),
);
const gitAttributes = readFileSync(new URL('../../.gitattributes', import.meta.url), 'utf8');

test('storefront deploys the supplied Jai Mata Di PNG without Git LFS', () => {
  assert.deepEqual([...logoAsset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.match(gitAttributes, /frontend\/public\/shoe-style-logo\.png -filter -diff -merge -text/);
  assert.match(gitAttributes, /admin\/public\/shoe-style-logo\.png -filter -diff -merge -text/);
  assert.match(logoComponent, /\/shoe-style-logo\.png/);
  assert.match(indexHtml, /rel="icon" type="image\/png" href="\/shoe-style-logo\.png"/);
  assert.match(indexHtml, /property="og:image" content="https:\/\/shoefashion\.in\/shoe-style-logo\.png\?v=6"/);
  assert.match(indexHtml, /property="og:image:type" content="image\/png"/);
  assert.match(indexHtml, /property="og:image:width" content="1760"/);
  assert.match(indexHtml, /property="og:image:height" content="880"/);
  assert.match(indexHtml, /name="twitter:image" content="https:\/\/shoefashion\.in\/shoe-style-logo\.png\?v=6"/);
  assert.match(paymentPage, /\/shoe-style-logo\.png/);
});

test('storefront links expose title, description, and canonical URL', () => {
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/shoefashion\.in\/" \/>/);
  assert.match(indexHtml, /property="og:title" content="Shoe Style \| Footwear in Sarojini Nagar"/);
  assert.match(indexHtml, /property="og:description" content="Shop footwear in sizes 35 to 41/);
  assert.match(indexHtml, /property="og:url" content="https:\/\/shoefashion\.in\/"/);
});
