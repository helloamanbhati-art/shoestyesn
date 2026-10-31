import { STORE } from '../config/store.ts';

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  shortDescription?: string;
  brand?: string;
  price: number;
  availableSizes?: string[];
}

export interface ChatAction {
  label: string;
  href: string;
}

export interface ChatAnswer {
  kind: 'about' | 'contact' | 'delivery' | 'fallback' | 'hours' | 'payment' | 'products' | 'sizes' | 'whatsapp';
  text: string;
  actions?: ChatAction[];
  products?: CatalogItem[];
}

const PHONE_ACTIONS = STORE.phones.map((phone) => ({ label: `Call ${phone}`, href: `tel:+91${phone}` }));

export function buildWhatsAppUrl(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('91') && digits.length > 10 ? digits : `91${digits}`;
  return `https://wa.me/${international}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

function includesAny(question: string, phrases: string[]) {
  return phrases.some((phrase) => question.includes(phrase));
}

function productMatches(question: string, product: CatalogItem) {
  const haystack = [product.name, product.category, product.description, product.shortDescription, product.brand, ...(product.availableSizes ?? [])]
    .filter(Boolean).join(' ').toLowerCase();
  const ignored = new Set(['are', 'can', 'do', 'for', 'have', 'i', 'in', 'is', 'looking', 'me', 'need', 'please', 'show', 'the', 'you']);
  const words = question.replace(/[^a-z0-9]+/g, ' ').split(' ').filter((word) => word.length > 1 && !ignored.has(word));
  return words.reduce((score, word) => score + (haystack.includes(word) || haystack.includes(word.replace(/s$/, '')) ? 1 : 0), 0);
}

function findProducts(question: string, catalog: CatalogItem[]) {
  return catalog
    .map((product) => ({ product, score: productMatches(question, product) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ product }) => product);
}

export function answerStoreQuestion(input: string, catalog: CatalogItem[] = []): ChatAnswer {
  const question = input.trim().toLowerCase();

  if (includesAny(question, ['whatsapp', 'whats app', 'chat with'])) {
    return {
      kind: 'whatsapp',
      text: `You can chat with ${STORE.name} directly on WhatsApp. Choose either number below.`,
      actions: STORE.whatsappNumbers.map((phone, index) => ({
        label: `WhatsApp ${index + 1}`,
        href: buildWhatsAppUrl(phone),
      })),
    };
  }

  if (includesAny(question, ['call', 'contact', 'phone', 'number', 'email', 'address', 'location', 'where are'])) {
    return {
      kind: 'contact',
      text: `Call us on ${STORE.phones.join(' or ')}. Email ${STORE.email}, or visit ${STORE.address}.`,
      actions: [...PHONE_ACTIONS, { label: 'Open WhatsApp', href: buildWhatsAppUrl(STORE.whatsappNumbers[0]) }],
    };
  }

  if (includesAny(question, ['open', 'close', 'closing', 'hours', 'timing', 'time do'])) {
    return {
      kind: 'hours',
      text: `Our store hours are not published on the website yet. Please call ${STORE.phones[0]} or confirm on WhatsApp before visiting.`,
      actions: [PHONE_ACTIONS[0], { label: 'Confirm on WhatsApp', href: buildWhatsAppUrl(STORE.whatsappNumbers[0], 'Hi, please confirm today’s store opening hours.') }],
    };
  }

  if (includesAny(question, ['delivery', 'deliver', 'shipping', 'arrive', 'how many days'])) {
    return {
      kind: 'delivery',
      text: `We deliver across India. Exact delivery time and charges are not published yet, so please confirm for your PIN code before ordering. ${STORE.paymentMethods}`,
      actions: [{ label: 'Confirm delivery', href: buildWhatsAppUrl(STORE.whatsappNumbers[0], 'Hi, I want to confirm delivery time and charges for my PIN code.') }],
    };
  }

  if (includesAny(question, ['payment', 'cod', 'cash on delivery', 'return', 'exchange', 'refund'])) {
    return { kind: 'payment', text: `${STORE.paymentMethods} ${STORE.exchangePolicy}` };
  }

  if (includesAny(question, ['show me shoes', 'show products', 'shop products', 'browse products', 'what do you sell']) && catalog.length) {
    return {
      kind: 'products',
      text: 'Here are a few styles from our live catalogue:',
      products: catalog.slice(0, 3),
      actions: [{ label: 'Shop all products', href: '/?view=all' }],
    };
  }

  const products = findProducts(question, catalog);
  if (products.length && includesAny(question, ['show', 'have', 'looking', 'shoe', 'heel', 'boot', 'sandal', 'sneaker', 'flat', 'size'])) {
    return {
      kind: 'products',
      text: `I found ${products.length === 1 ? 'this match' : 'these matches'} in our live catalogue:`,
      products,
    };
  }

  if (includesAny(question, ['size', 'fit', 'measurement'])) {
    return {
      kind: 'sizes',
      text: `Women’s footwear is available in EU sizes ${STORE.availableSizes}. Use the size guide for EU, UK, India and foot-length conversions.`,
      actions: [{ label: 'Open size guide', href: '/size-guide' }],
    };
  }

  if (includesAny(question, ['about', 'story', 'who are', 'shop'])) {
    return {
      kind: 'about',
      text: `${STORE.name} is a Delhi footwear store with 40 years of experience. We personally select women’s footwear and deliver across India.`,
      actions: [{ label: 'Read our story', href: '/about-us' }],
    };
  }

  if (products.length) {
    return {
      kind: 'products',
      text: `I found ${products.length === 1 ? 'this match' : 'these matches'} in our live catalogue:`,
      products,
    };
  }

  return {
    kind: 'fallback',
    text: 'I can help with products, sizes, delivery, store hours, contact details, payments, exchanges, or WhatsApp. Try asking “show me black boots” or choose an option below.',
  };
}
