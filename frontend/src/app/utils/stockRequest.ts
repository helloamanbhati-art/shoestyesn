export interface StockRequestDetails {
  productName: string;
  productCode: string;
  size: string;
  shareUrl: string;
}

export function buildStockRequestMessage(details: StockRequestDetails): string {
  return [
    'Hi Sarojini Shoe Style,',
    '',
    `Is this product available in EU size ${details.size}? Please send me the availability details.`,
    `Product: ${details.productName}`,
    `Product code: ${details.productCode}`,
    `EU size: ${details.size}`,
    '',
    details.shareUrl,
  ].join('\n');
}
