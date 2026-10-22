import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/app/pages/admin/AdminAnalytics.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');

test('analytics dashboard uses a safe scroll area without clipping content', () => {
  assert.match(source, /className="analytics-dashboard rounded-none"/);
  assert.match(styles, /\.analytics-dashboard \{[^}]*max-height: calc\(100svh - 5\.75rem\)/s);
  assert.match(styles, /overflow-y: auto/);
  assert.doesNotMatch(styles, /\.analytics-dashboard \{[^}]*overflow: hidden/s);
  assert.match(source, /grid grid-cols-2 border border-gray-200 bg-white lg:grid-cols-4/);
  assert.match(source, /analytics-report-grid/);
  assert.match(styles, /\.analytics-secondary-grid \{[^}]*grid-template-columns: 1fr/s);
  assert.match(source, /<ResponsiveContainer width="100%" height="100%"/);
  assert.doesNotMatch(styles, /\.analytics-dashboard > :nth-child/);
});

test('analytics matches the flat Brands presentation', () => {
  assert.match(source, /analytics-dashboard[^\n]*rounded-none/);
  assert.match(source, /text-green-700/);
  assert.match(source, /bg-green-600/);
  assert.doesNotMatch(source, /bg-gradient-to-r/);
  assert.match(styles, /\.recharts-responsive-container \{ min-height: 0 !important; height: 100% !important; \}/);
  assert.match(source, /aria-pressed=\{timeRange === range\}/);
});
