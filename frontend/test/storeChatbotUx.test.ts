import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/app/components/StoreChatbot.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');

test('chatbot keeps the main questions available after every answer', () => {
  assert.doesNotMatch(component, /messages\.length\s*===\s*1\s*\?\s*\(\s*<div className="store-chat-quick"/s);
  assert.match(component, /What else can I help with\?/);
  assert.match(component, /label:\s*'Store location',\s*question:\s*'Where is your store located\?'/);
});

test('chatbot product results wrap without horizontal mobile overflow', () => {
  assert.match(styles, /\.store-chat-log\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(styles, /\.store-chat-product span\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /\.store-chat-product\s*\{[^}]*min-width:\s*0|\.store-chat-product\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});
