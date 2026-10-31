import test from 'node:test';
import assert from 'node:assert/strict';
import { answerStoreQuestion, buildWhatsAppUrl, type CatalogItem } from '../src/app/chatbot/chatbotKnowledge.ts';

const catalog: CatalogItem[] = [
  { id: 'red-heel', name: 'Ruby Red Heel', category: 'Heels', description: 'Red party heel', price: 1299, availableSizes: ['36', '37'] },
  { id: 'black-boot', name: 'Midnight Boot', category: 'Boots', description: 'Black ankle boot', price: 1899, availableSizes: ['38'] },
];

test('chatbot answers contact questions with both published phone numbers', () => {
  const answer = answerStoreQuestion('How can I call you?', catalog);
  assert.match(answer.text, /7982558322/);
  assert.match(answer.text, /7827766744/);
  assert.equal(answer.kind, 'contact');
});

test('chatbot provides a direct WhatsApp handoff', () => {
  const answer = answerStoreQuestion('whatsapp please', catalog);
  assert.equal(answer.kind, 'whatsapp');
  assert.equal(answer.actions?.[0]?.href, 'https://wa.me/917982558322');
});

test('chatbot searches the live catalogue by product attributes', () => {
  const answer = answerStoreQuestion('Do you have red heels in size 36?', catalog);
  assert.equal(answer.kind, 'products');
  assert.equal(answer.products?.[0]?.id, 'red-heel');
  assert.doesNotMatch(answer.text, /Midnight Boot/);
});

test('chatbot offers live products for a general shopping request', () => {
  const answer = answerStoreQuestion('Show me shoes', catalog);
  assert.equal(answer.kind, 'products');
  assert.equal(answer.products?.length, 2);
});

test('chatbot does not invent unpublished opening or delivery times', () => {
  assert.match(answerStoreQuestion('What time do you open?', catalog).text, /not published/i);
  assert.match(answerStoreQuestion('How many days for delivery?', catalog).text, /confirm/i);
});

test('chatbot builds an encoded WhatsApp URL with an optional message', () => {
  assert.equal(buildWhatsAppUrl('7982558322', 'Hi, I need size help'), 'https://wa.me/917982558322?text=Hi%2C%20I%20need%20size%20help');
});
