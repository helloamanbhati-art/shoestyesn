export const WOMEN_SHOE_SIZE_ROWS = [
  { eu: '35', uk: '2.5', india: '2.5', footLength: '22.0' },
  { eu: '36', uk: '3.5', india: '3.5', footLength: '22.5' },
  { eu: '37', uk: '4', india: '4', footLength: '23.0' },
  { eu: '38', uk: '5', india: '5', footLength: '24.0' },
  { eu: '39', uk: '6', india: '6', footLength: '24.5' },
  { eu: '40', uk: '6.5', india: '6.5', footLength: '25.0' },
  { eu: '41', uk: '7.5', india: '7.5', footLength: '26.0' },
  { eu: '42', uk: '8', india: '8', footLength: '26.5' },
  { eu: '43', uk: '9', india: '9', footLength: '27.5' },
] as const;

const LEGACY_WOMEN_SIZE_TO_EU: Record<string, string> = {
  '2': '35',
  '3': '36',
  '4': '37',
  '5': '38',
  '6': '39',
  '7': '40',
  '8': '42',
  '9': '43',
  '10': '44',
};

export function getEuShoeSize(storedSize: string): string {
  const normalized = String(storedSize).trim();
  if (WOMEN_SHOE_SIZE_ROWS.some((row) => row.eu === normalized)) return normalized;
  return LEGACY_WOMEN_SIZE_TO_EU[normalized] ?? normalized;
}

function searchableValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name;
  return '';
}

export function isFootwearProduct(product: { name?: unknown; category?: unknown; clothingType?: unknown }): boolean {
  const productText = [product.name, product.category, product.clothingType].map(searchableValue).join(' ').toLowerCase();
  return ['shoe', 'heel', 'sneaker', 'boot', 'sandal', 'chappal', 'jutti', 'slipper', 'pump'].some((term) => productText.includes(term));
}
