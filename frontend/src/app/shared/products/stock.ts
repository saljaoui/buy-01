/** At or below this quantity the UI says "Only N left". */
export const LOW_STOCK_THRESHOLD = 5;

export interface StockBadge {
  label: string;
  tone: 'in' | 'low' | 'out';
}

/** Stock label shared by product cards and the product page. */
export function stockBadge(quantity: number): StockBadge {
  if (quantity <= 0) return { label: 'Out of stock', tone: 'out' };
  if (quantity <= LOW_STOCK_THRESHOLD) return { label: `Only ${quantity} left`, tone: 'low' };
  return { label: 'In stock', tone: 'in' };
}

/** First letter of a name, for products without a photo. */
export function productInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '·';
}
