import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storeConfig = readFileSync(new URL('../src/app/config/store.ts', import.meta.url), 'utf8');
const storeInformation = readFileSync(new URL('../src/app/pages/StoreInformation.tsx', import.meta.url), 'utf8');
const chatbotKnowledge = readFileSync(new URL('../src/app/chatbot/chatbotKnowledge.ts', import.meta.url), 'utf8');

test('every storefront location option opens the configured Google Maps location', () => {
  assert.match(storeConfig, /mapUrl:\s*'https:\/\/maps\.app\.goo\.gl\/piEvZEpgH6fBeSaP9'/);
  assert.ok((storeInformation.match(/href=\{STORE\.mapUrl\}/g) ?? []).length >= 2);
  assert.match(chatbotKnowledge, /label:\s*'Get directions',\s*href:\s*STORE\.mapUrl/);
});
