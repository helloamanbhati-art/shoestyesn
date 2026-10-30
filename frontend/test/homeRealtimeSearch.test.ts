import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('homepage searches the live catalog as the customer types', () => {
  assert.match(home, /window\.setTimeout\(async \(\) =>/);
  assert.match(home, /\/products\/search\?q=\$\{encodeURIComponent\(term\)\}/);
  assert.match(home, /controller\.abort\(\)/);
  assert.match(home, /\}, \[query, searchAttempt\]\)/);
  assert.match(home, /placeholder=['"]Search by name, colour, category or type['"]/);
});

test('search results use a compact heading instead of a tall empty header', () => {
  assert.match(styles, /\.storefront-results\s*\{[^}]*padding-top:\s*24px;/);
  assert.match(styles, /\.storefront-results\s+\.storefront-section-heading\s*\{[^}]*margin-bottom:\s*24px;/);
  assert.match(styles, /@media\s*\(max-width:\s*767px\)[\s\S]*\.storefront-results\s*\{[^}]*padding:\s*20px 12px 48px;/);
});
