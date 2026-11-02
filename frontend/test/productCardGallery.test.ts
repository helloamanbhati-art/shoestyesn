import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { getProductCardMedia, getProductVariantPreviews } from '../src/app/components/productCardGallery.ts';

const cardSource = readFileSync(
  new URL('../src/app/components/ProductCard.tsx', import.meta.url),
  'utf8',
);

test('collects unique product and variant media in display order', () => {
  const media = getProductCardMedia({
    image: 'cover.jpg',
    images: ['cover.jpg', 'side.jpg', ''],
    variants: [
      { images: [{ imageUrl: 'side.jpg' }, { imageUrl: 'back.jpg' }] },
      { images: [{ imageUrl: 'detail.jpg' }] },
    ],
  });

  assert.deepEqual(media, ['cover.jpg', 'side.jpg', 'back.jpg', 'detail.jpg']);
});

test('collects the first real image from every product variant for card previews', () => {
  assert.deepEqual(getProductVariantPreviews({
    variants: [
      { variantId: 'red', variantName: 'Red', images: [{ imageUrl: 'red-front.jpg' }, { imageUrl: 'red-side.jpg' }] },
      { variantId: 'black', variantName: 'Black', images: [{ imageUrl: 'black-front.jpg' }] },
      { variantId: 'empty', variantName: 'Empty', images: [] },
    ],
  }), [
    { id: 'red', name: 'Red', image: 'red-front.jpg' },
    { id: 'black', name: 'Black', image: 'black-front.jpg' },
  ]);
});

test('product cards show rounded variant-first-image previews below the main image', () => {
  assert.match(cardSource, /const variantPreviews = getProductVariantPreviews\(product\)/);
  assert.match(cardSource, /variantPreviews\.length > 1/);
  assert.match(cardSource, /rounded-full/);
  assert.match(cardSource, /alt=\{`\$\{product\.name\} in \$\{preview\.name\}`\}/);
});

test('desktop hover gallery cycles every product image and stops on leave', () => {
  assert.match(cardSource, /matchMedia\('\(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)'\)/);
  assert.match(cardSource, /setInterval/);
  assert.match(cardSource, /onMouseEnter=\{startGalleryAutoplay\}/);
  assert.match(cardSource, /onMouseLeave=\{stopGalleryAutoplay\}/);
  assert.match(cardSource, /clearInterval/);
});

test('mobile gallery is horizontally swipeable with snap points and position dots', () => {
  assert.match(cardSource, /overflow-x-auto/);
  assert.match(cardSource, /snap-x snap-mandatory/);
  assert.match(cardSource, /snap-center/);
  assert.match(cardSource, /aria-label=\{`Image \$\{index \+ 1\} of \$\{galleryMedia\.length\}`\}/);
  assert.match(cardSource, /onScroll=\{handleMobileScroll\}/);
  assert.match(cardSource, /role="img" aria-label=\{`Product image position \$\{activeImageIndex \+ 1\} of \$\{galleryMedia\.length\}`\}/);
});

test('mobile gallery automatically advances while visible and pauses during touch', () => {
  assert.match(cardSource, /IntersectionObserver/);
  assert.match(cardSource, /scrollTo\(\{ left: next \* viewport\.clientWidth, behavior: 'smooth' \}\)/);
  assert.match(cardSource, /onTouchStart=\{stopGalleryAutoplay\}/);
  assert.match(cardSource, /onTouchEnd=\{startMobileGalleryAutoplay\}/);
  assert.match(cardSource, /prefers-reduced-motion: reduce/);
});
