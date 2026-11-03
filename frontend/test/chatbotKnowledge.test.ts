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

test('chatbot answers the store location quick question with the published address', () => {
  const answer = answerStoreQuestion('Where is your store located?', catalog);
  assert.equal(answer.kind, 'contact');
  assert.match(answer.text, /Shop No\. 14, Shoe Style, Sarojini Nagar Market/);
  assert.equal(answer.actions?.[0]?.label, 'Get directions');
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

test('every visible quick question returns its related answer type', () => {
  const brandedCatalog: CatalogItem[] = [
    ...catalog,
    { id: 'shoe-style-boot', name: 'Black Boot', category: 'Boots', brand: 'Shoe Style', price: 2450 },
  ];
  const quickQuestions = [
    ['Show me shoes', 'products'],
    ['Where is your store located?', 'contact'],
    ['What time do you open?', 'hours'],
    ['Give me both phone numbers', 'contact'],
    ['Open WhatsApp', 'whatsapp'],
    ['Tell me about Shoe Style', 'about'],
  ] as const;

  for (const [question, expectedKind] of quickQuestions) {
    assert.equal(answerStoreQuestion(question, brandedCatalog).kind, expectedKind, question);
  }
});

test('chatbot answers opening-time questions with the published store hours', () => {
  const answer = answerStoreQuestion('What time do you open?', catalog);
  assert.equal(answer.kind, 'hours');
  assert.match(answer.text, /11:00 AM to 10:00 PM/);
});

test('chatbot does not invent unpublished delivery times', () => {
  assert.match(answerStoreQuestion('How many days for delivery?', catalog).text, /confirm/i);
});

test('chatbot builds an encoded WhatsApp URL with an optional message', () => {
  assert.equal(buildWhatsAppUrl('7982558322', 'Hi, I need size help'), 'https://wa.me/917982558322?text=Hi%2C%20I%20need%20size%20help');
});
