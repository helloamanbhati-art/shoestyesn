import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const postersSource = readFileSync(new URL('../src/app/components/PromotionalPosters.tsx', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('promotional posters follow trending styles on the homepage', () => {
  const trendingPosition = homeSource.indexOf('<TrendingStyles');
  const postersPosition = homeSource.indexOf('<PromotionalPosters');

  assert.ok(trendingPosition >= 0, 'expected trending styles on the homepage');
  assert.ok(postersPosition > trendingPosition, 'expected promotional posters after trending styles');
});

test('promotional posters provide two accessible collection links', () => {
  assert.match(postersSource, /New Collection/);
  assert.match(postersSource, /Clearance Sale/);
  assert.match(postersSource, /Shop new collection/);
  assert.match(postersSource, /Shop clearance sale/);
  assert.match(postersSource, /className="promotional-poster-image"/);
  assert.match(postersSource, /backgroundImage:/);
  assert.doesNotMatch(postersSource, /<img/);
});

test('promotional posters use a responsive two-column layout', () => {
  assert.match(stylesSource, /\.promotional-posters\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(stylesSource, /@media\s*\(max-width:\s*767px\)[\s\S]*\.promotional-posters\s*\{[^}]*grid-template-columns:\s*1fr/);
});
