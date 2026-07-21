import type { InvoiceItemData } from './types';

export function calculateItemAmount(item: InvoiceItemData): number {
  return item.qty * item.rate;
}

export function calculateSubtotal(items: InvoiceItemData[]): number {
  return items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
}

export function calculateTaxAmount(subtotal: number, taxEnabled: boolean, taxRate: number): number {
  if (!taxEnabled || taxRate <= 0) return 0;
  return subtotal * (taxRate / 100);
}

export function calculateDiscountAmount(
  subtotal: number,
  discountEnabled: boolean,
  discountType: 'flat' | 'percent',
  discountValue: number
): number {
  if (!discountEnabled || discountValue <= 0) return 0;
  if (discountType === 'flat') return discountValue;
  return subtotal * (discountValue / 100);
}

export function calculateTotal(
  subtotal: number,
  taxAmount: number,
  discountAmount: number
): number {
  return Math.max(0, subtotal + taxAmount - discountAmount);
}
