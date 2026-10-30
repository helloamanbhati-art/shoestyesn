import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectTrendingStyleMedia } from '../src/app/components/trendingStyleMedia.ts';

const homeSource = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const trendingSource = readFileSync(new URL('../src/app/components/TrendingStyles.tsx', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('desktop trending styles follow the new-arrivals view-all section', () => {
  const arrivalsPosition = homeSource.indexOf('<NewArrivalsRail');
  const trendingPosition = homeSource.indexOf('<TrendingStyles');

  assert.ok(arrivalsPosition >= 0, 'expected the new-arrivals section');
  assert.ok(trendingPosition > arrivalsPosition, 'expected trending styles after new arrivals');
});

test('trending styles include accessible carousel controls and a collection link', () => {
  assert.match(trendingSource, /id="trending-styles-title"/);
  assert.match(trendingSource, /aria-label="Previous trending styles"/);
  assert.match(trendingSource, /aria-label="Next trending styles"/);
  assert.match(trendingSource, /to="\/products"/);
  assert.match(trendingSource, /View all/i);
  assert.match(trendingSource, /scrollBy/);
});

test('trending styles show four editorial tiles on desktop and stay hidden on mobile', () => {
  assert.match(stylesSource, /\.trending-styles-rail\s*\{[^}]*grid-auto-columns:\s*calc\(\(100%\s*-\s*48px\)\s*\/\s*4\)/);
  assert.match(stylesSource, /@media\s*\(max-width:\s*767px\)[\s\S]*\.trending-styles\s*\{\s*display:\s*none;/);
});

test('trending styles prefer model-worn lifestyle photos from the product gallery', () => {
  const product = {
    image: 'https://cdn.example.com/denim-side.png',
    images: [
      'https://cdn.example.com/denim-side.png',
      'https://cdn.example.com/denim-front-back.png',
      'https://cdn.example.com/denim-lifestyle.png',
    ],
    variants: [],
  };

  assert.equal(selectTrendingStyleMedia(product), 'https://cdn.example.com/denim-lifestyle.png');
});

test('trending styles exclude products without a model-worn lifestyle photo', () => {
  const product = {
    image: 'https://cdn.example.com/gold-toe-boot.png',
    images: ['https://cdn.example.com/gold-toe-boot.png'],
    variants: [],
  };

  assert.equal(selectTrendingStyleMedia(product), '');
});
