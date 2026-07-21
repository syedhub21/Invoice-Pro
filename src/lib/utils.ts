import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Multi-Currency Support ──────────────────────────────────
export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
];

export function getCurrencyConfig(code?: string): CurrencyConfig {
  return CURRENCIES.find(c => c.code === (code || 'INR')) || CURRENCIES[0];
}

export function formatCurrency(amount: number, currencyCode?: string): string {
  const config = getCurrencyConfig(currencyCode);
  const noDecimals = config.code === 'JPY';
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  }).format(amount);
}

export function formatAmount(amount: number, currencyCode?: string): string {
  return formatCurrency(amount, currencyCode);
}

// ─── Invoice Number Formatting ───────────────────────────────
export function formatInvoiceNumber(num: number, prefix?: string, digits?: number): string {
  const p = prefix || 'INV-';
  const d = digits || 4;
  return `${p}${String(num).padStart(d, '0')}`;
}

// ─── Indian Number Formatting (legacy compat) ────────────────
const indianFmt = (n: number): string =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export { indianFmt };
