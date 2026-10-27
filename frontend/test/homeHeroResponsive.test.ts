import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home = readFileSync(new URL('../src/app/pages/Home.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/app/components/Navbar.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/pages/Layout.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('storefront shell mirrors the premium reference structure', () => {
  assert.match(nav, /storefront-header/);
  assert.match(nav, /Shop/);
  assert.match(nav, /Return & Exchange/);
  assert.match(home, /storefront-benefits/);
  assert.match(home, /storefront-search/);
  assert.match(home, /storefront-hero/);
});

test('search is URL-synchronised and uses the real search API', () => {
  assert.match(home, /useSearchParams/);
  assert.match(home, /\/api\/v1\/products\/search\?q=/);
  assert.match(home, /AbortController/);
  assert.match(home, /role="status"/);
});

test('homepage search matches the compact block-heel reference treatment', () => {
  assert.match(home, /placeholder='Search for "Block Heels"'/);
  assert.match(home, /className="storefront-search-submit"/);
  assert.match(styles, /\.storefront-search-submit\s*\{[^}]*position:\s*absolute;[^}]*width:\s*1px;/s);
});

test('responsive navigation and support affordances remain available', () => {
  assert.match(nav, /aria-controls="mobile-menu"/);
  assert.match(layout, /STORE\.whatsappNumbers/);
  assert.match(layout, /Customer support/);
});

test('desktop header keeps the logo left and navigation centered in one bar', () => {
  assert.match(nav, /storefront-brand-row[\s\S]*storefront-logo[\s\S]*storefront-nav[\s\S]*storefront-actions/);
  assert.match(nav, /fixedLinks[\s\S]*Shop[\s\S]*Sale[\s\S]*Style Guide/);
  assert.match(nav, /storefront-nav[\s\S]*fixedLinks\.map/);
});

test('hero rotates through every live category and each banner opens that category', () => {
  assert.match(home, /const HERO_ROTATION_MS = 5000/);
  assert.match(home, /categories\.map\(\(category, index\)/);
  assert.match(home, /window\.setInterval/);
  assert.match(home, /setActiveHeroIndex\(\(index\) => \(index \+ 1\) % heroSlides\.length\)/);
  assert.match(home, /to=\{activeHero\.href\}/);
  assert.match(home, /aria-label=\{`Shop \$\{activeHero\.category\}`\}/);
});

test('hero category label and carousel dots are horizontally centered', () => {
  assert.match(styles, /\.storefront-hero-cta\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/s);
  assert.match(styles, /\.storefront-hero-dots\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/s);
  assert.doesNotMatch(styles, /\.storefront-hero-dots\s*\{[^}]*right:/s);
});

test('hero category label appears only after the new banner settles', () => {
  assert.match(home, /<Link key=\{activeHero\.category\} to=\{activeHero\.href\} className="storefront-hero-cta"[^>]*>/);
  assert.match(styles, /\.storefront-hero-cta\s*\{[^}]*animation:\s*hero-cta-reveal\s+\.3s\s+ease-out\s+\.45s\s+both;/s);
  assert.match(styles, /@keyframes hero-cta-reveal\s*\{\s*from\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translate\(-50%,\s*8px\);[^}]*\}\s*to\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*translateX\(-50%\);/s);
});

test('hero category uses large transparent-overlay typography', () => {
  assert.match(home, /className="storefront-hero-cta"[^>]*>\{activeHero\.category\}<\/Link>/);
  assert.match(styles, /\.storefront-hero-cta\s*\{[^}]*background:\s*transparent;[^}]*font-size:\s*clamp\(/s);
  assert.match(styles, /\.storefront-hero-cta\s*\{[^}]*text-shadow:/s);
  assert.doesNotMatch(styles, /\.storefront-hero-cta\s*\{[^}]*background:\s*#772a38;/s);
});

test('mobile hero matches the reference banner proportions and overlay placement', () => {
  assert.match(home, /<Link key=\{activeHero\.category\} to=\{activeHero\.href\} className="storefront-hero-cta"[^>]*>\{activeHero\.category\}<\/Link>/);
  assert.ok(home.indexOf('storefront-hero') < home.indexOf('storefront-benefits'), 'banner should sit directly below the search bar');
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.storefront-hero\s*\{[^}]*height:\s*auto;[^}]*aspect-ratio:\s*395\s*\/\s*366;[^}]*min-height:\s*0;/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.storefront-hero-cta\s*\{[^}]*top:\s*43%;[^}]*bottom:\s*auto;/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.storefront-hero-dots\s*\{[^}]*bottom:\s*16px;/);
});

test('hero banners fill the full banner frame without empty space', () => {
  assert.match(styles, /\.storefront-hero-link\s*>\s*img\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;/s);
  assert.doesNotMatch(styles, /\.storefront-hero-link\s*>\s*img\s*\{[^}]*object-fit:\s*contain;/s);
});

test('mobile new arrivals continue the product grid after the full collection link', () => {
  assert.match(home, />View all products <ArrowRight size=\{15\}\/>/);
  assert.match(home, /index === 2 && <Link className="new-arrivals-mobile-view-all"/);
  assert.match(home, /new-arrivals-card \$\{index % 3 === 2 \? 'is-wide' : ''\}/);
  assert.doesNotMatch(styles, /\.new-arrivals-card:nth-child\(n \+ 3\)\s*\{\s*display:\s*none;/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.new-arrivals-mobile-view-all\s*\{[^}]*display:\s*flex;[^}]*grid-column:\s*1\s*\/\s*-1;/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.new-arrivals-card\.is-wide\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/);
  assert.match(styles, /\.new-arrivals-view-all\s*\{[^}]*min-height:\s*46px[^}]*\}/s);
});
