/**
 * Local storage abstraction layer for InvoicePro.
 *
 * All data is stored client-side in the browser's localStorage. This makes the
 * app fully offline-capable (perfect for the Capacitor APK build) — no server,
 * no database, no accounts required.
 *
 * Storage keys are namespaced under `invoicepro:*` to avoid collisions.
 */

import type {
  AppSettingsData,
  BusinessProfileData,
  ClientData,
  DashboardStats,
  ExpenseData,
  InvoiceFormData,
  InvoiceListItem,
  RecurringInvoiceData,
} from '@/lib/types';

// ─── Storage Keys ──────────────────────────────────────────────

const KEYS = {
  profile: 'invoicepro:profile',
  settings: 'invoicepro:settings',
  invoices: 'invoicepro:invoices',
  draft: 'invoicepro:draft',
  clients: 'invoicepro:clients',
  expenses: 'invoicepro:expenses',
  recurring: 'invoicepro:recurring',
} as const;

// ─── Helpers ───────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded or storage disabled — fail silently for offline use
    console.warn(`[local-storage] Failed to write ${key}:`, err);
  }
}

function remove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Default Values ────────────────────────────────────────────

const DEFAULT_PROFILE: BusinessProfileData = {
  companyName: 'My Business',
  address: '',
  mobile: '',
  email: '',
  gstin: '',
  pan: '',
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  upiId: '',
  logoPath: '',
  signaturePath: '',
  termsConditions: 'Payment due within 15 days of invoice date.\nLate payments subject to 1.5% monthly interest.\nAll goods sold are not returnable.',
};

const DEFAULT_SETTINGS: AppSettingsData = {
  darkMode: false,
  defaultTemplate: 'classic',
  autoSave: true,
  autoSaveInterval: 30,
  taxDefault: true,
  taxRateDefault: 18,
  currency: 'INR',
  recurringEnabled: false,
  qrEnabled: false,
  signatureEnabled: false,
  invoicePrefix: 'INV-',
  invoiceDigits: 4,
};

// ─── Stored Invoice Type ──────────────────────────────────────
// Combines InvoiceFormData with metadata fields (status, timestamps).

export interface StoredInvoice extends InvoiceFormData {
  id: string;
  status: 'draft' | 'finalized' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  finalizedDate?: string;
  paidDate?: string;
}

// ─── Profile ──────────────────────────────────────────────────

export function getProfile(): BusinessProfileData {
  return read<BusinessProfileData>(KEYS.profile, DEFAULT_PROFILE);
}

export function saveProfile(profile: BusinessProfileData): void {
  write(KEYS.profile, profile);
}

// ─── Settings ─────────────────────────────────────────────────

export function getSettings(): AppSettingsData {
  return read<AppSettingsData>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettingsData): void {
  write(KEYS.settings, settings);
}

// ─── Invoices ─────────────────────────────────────────────────

export function getInvoices(): StoredInvoice[] {
  return read<StoredInvoice[]>(KEYS.invoices, []);
}

export function getInvoiceById(id: string): StoredInvoice | null {
  const invoices = getInvoices();
  return invoices.find((inv) => inv.id === id) ?? null;
}

/**
 * Save (create or update) an invoice with the given status.
 * Returns the stored invoice (with id + timestamps).
 */
export function saveInvoice(
  invoice: InvoiceFormData,
  status: 'draft' | 'finalized' = 'draft',
): StoredInvoice {
  const invoices = getInvoices();
  const now = new Date().toISOString();

  // Update existing
  if (invoice.id) {
    const idx = invoices.findIndex((inv) => inv.id === invoice.id);
    if (idx >= 0) {
      const existing = invoices[idx];
      const updated: StoredInvoice = {
        ...existing,
        ...invoice,
        id: existing.id,
        status,
        updatedAt: now,
        finalizedDate: status === 'finalized' ? now : existing.finalizedDate,
        paidDate: status === 'paid' ? now : existing.paidDate,
      };
      invoices[idx] = updated;
      write(KEYS.invoices, invoices);
      return updated;
    }
  }

  // Create new
  const newInvoice: StoredInvoice = {
    ...invoice,
    id: uid(),
    status,
    createdAt: now,
    updatedAt: now,
    finalizedDate: status === 'finalized' ? now : undefined,
    paidDate: status === 'paid' ? now : undefined,
  };
  invoices.push(newInvoice);
  write(KEYS.invoices, invoices);
  return newInvoice;
}

export function updateInvoiceStatus(
  id: string,
  status: string,
  date?: string,
): void {
  const invoices = getInvoices();
  const idx = invoices.findIndex((inv) => inv.id === id);
  if (idx < 0) return;
  const now = date ?? new Date().toISOString();
  invoices[idx] = {
    ...invoices[idx],
    status: status as StoredInvoice['status'],
    updatedAt: now,
    finalizedDate: status === 'finalized' ? now : invoices[idx].finalizedDate,
    paidDate: status === 'paid' ? now : invoices[idx].paidDate,
  };
  write(KEYS.invoices, invoices);
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices();
  write(
    KEYS.invoices,
    invoices.filter((inv) => inv.id !== id),
  );
}

// ─── Draft (current working invoice, not yet saved) ──────────

export function getDraft(): InvoiceFormData | null {
  return read<InvoiceFormData | null>(KEYS.draft, null);
}

export function saveDraft(draft: InvoiceFormData): void {
  write(KEYS.draft, draft);
}

export function clearDraft(): void {
  remove(KEYS.draft);
}

// ─── Dashboard Stats ──────────────────────────────────────────

export function getStats(): DashboardStats {
  const invoices = getInvoices();
  const finalizedOrPaid = invoices.filter(
    (inv) => inv.status === 'finalized' || inv.status === 'paid',
  );

  const totalRevenue = finalizedOrPaid.reduce(
    (sum, inv) => sum + (inv.totalAmount || 0),
    0,
  );

  const pendingAmount = finalizedOrPaid
    .filter((inv) => inv.status === 'finalized')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // Recent invoices (last 5), newest first
  const recentInvoices: InvoiceListItem[] = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      totalAmount: inv.totalAmount,
      status: inv.status,
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
      finalizedDate: inv.finalizedDate,
      paidDate: inv.paidDate,
      documentType: inv.documentType,
      validUntil: inv.validUntil,
      paymentMethod: inv.paymentMethod,
    }));

  return {
    totalInvoices: invoices.length,
    totalRevenue,
    pendingAmount,
    recentInvoices,
  };
}

// ─── Clients ──────────────────────────────────────────────────

export function getClients(): ClientData[] {
  return read<ClientData[]>(KEYS.clients, []);
}

export function saveClient(client: ClientData): void {
  const clients = getClients();
  const now = new Date().toISOString();

  if (client.id) {
    const idx = clients.findIndex((c) => c.id === client.id);
    if (idx >= 0) {
      clients[idx] = { ...client, updatedAt: now };
      write(KEYS.clients, clients);
      return;
    }
  }

  const newClient: ClientData = {
    ...client,
    id: client.id || uid(),
    createdAt: now,
    updatedAt: now,
  };
  clients.push(newClient);
  write(KEYS.clients, clients);
}

export function deleteClient(id: string): void {
  const clients = getClients();
  write(
    KEYS.clients,
    clients.filter((c) => c.id !== id),
  );
}

// ─── Expenses ─────────────────────────────────────────────────

export function getExpenses(): ExpenseData[] {
  return read<ExpenseData[]>(KEYS.expenses, []);
}

export function saveExpense(expense: ExpenseData): void {
  const expenses = getExpenses();
  const now = new Date().toISOString();

  if (expense.id) {
    const idx = expenses.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      expenses[idx] = { ...expense, createdAt: expense.createdAt || now };
      write(KEYS.expenses, expenses);
      return;
    }
  }

  const newExpense: ExpenseData = {
    ...expense,
    id: expense.id || uid(),
    createdAt: now,
  };
  expenses.push(newExpense);
  write(KEYS.expenses, expenses);
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses();
  write(
    KEYS.expenses,
    expenses.filter((e) => e.id !== id),
  );
}

export interface ExpenseStats {
  total: number;
  totalThisMonth: number;
  totalThisYear: number;
  byCategory: Record<string, number>;
}

export function getExpenseStats(): ExpenseStats {
  const expenses = getExpenses();
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  let total = 0;
  let totalThisMonth = 0;
  let totalThisYear = 0;
  const byCategory: Record<string, number> = {};

  for (const exp of expenses) {
    const amount = exp.amount || 0;
    total += amount;
    const date = new Date(exp.date || exp.createdAt);
    if (date.getFullYear() === thisYear) {
      totalThisYear += amount;
      if (date.getMonth() === thisMonth) {
        totalThisMonth += amount;
      }
    }
    const cat = exp.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + amount;
  }

  return { total, totalThisMonth, totalThisYear, byCategory };
}

// ─── Recurring Invoices ───────────────────────────────────────

export function getRecurringInvoices(): RecurringInvoiceData[] {
  return read<RecurringInvoiceData[]>(KEYS.recurring, []);
}

export function saveRecurringInvoice(invoice: RecurringInvoiceData): void {
  const items = getRecurringInvoices();

  if (invoice.id) {
    const idx = items.findIndex((r) => r.id === invoice.id);
    if (idx >= 0) {
      items[idx] = { ...invoice };
      write(KEYS.recurring, items);
      return;
    }
  }

  const newInvoice: RecurringInvoiceData = {
    ...invoice,
    id: invoice.id || uid(),
  };
  items.push(newInvoice);
  write(KEYS.recurring, items);
}

export function deleteRecurringInvoice(id: string): void {
  const items = getRecurringInvoices();
  write(
    KEYS.recurring,
    items.filter((r) => r.id !== id),
  );
}

// ─── Storage Usage & Data Management ──────────────────────────

export interface StorageUsageItem {
  key: string;
  label: string;
  size: number;
}

export interface StorageUsage {
  used: number;
  total: number;
  items: StorageUsageItem[];
}

const STORAGE_LABELS: Record<string, string> = {
  [KEYS.profile]: 'Business Profile',
  [KEYS.settings]: 'Settings',
  [KEYS.invoices]: 'Invoices',
  [KEYS.draft]: 'Draft',
  [KEYS.clients]: 'Clients',
  [KEYS.expenses]: 'Expenses',
  [KEYS.recurring]: 'Recurring',
};

export function getStorageUsage(): StorageUsage {
  if (!isBrowser()) {
    return { used: 0, total: 5 * 1024 * 1024, items: [] };
  }
  let used = 0;
  const items: StorageUsageItem[] = [];
  try {
    for (const key of Object.values(KEYS)) {
      const raw = window.localStorage.getItem(key);
      const size = raw ? raw.length + key.length : 0;
      used += size;
      items.push({
        key,
        label: STORAGE_LABELS[key] ?? key,
        size,
      });
    }
  } catch {
    /* noop */
  }
  // Browsers typically allow ~5MB per origin
  return { used, total: 5 * 1024 * 1024, items };
}

export interface ExportedData {
  version: 1;
  exportedAt: string;
  profile: BusinessProfileData;
  settings: AppSettingsData;
  invoices: StoredInvoice[];
  draft: InvoiceFormData | null;
  clients: ClientData[];
  expenses: ExpenseData[];
  recurring: RecurringInvoiceData[];
}

export function exportAllData(): ExportedData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: getProfile(),
    settings: getSettings(),
    invoices: getInvoices(),
    draft: getDraft(),
    clients: getClients(),
    expenses: getExpenses(),
    recurring: getRecurringInvoices(),
  };
}

export function importAllData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<ExportedData>;
  if (d.version !== 1) return false;

  try {
    if (d.profile) write(KEYS.profile, d.profile);
    if (d.settings) write(KEYS.settings, d.settings);
    if (Array.isArray(d.invoices)) write(KEYS.invoices, d.invoices);
    if (d.draft !== undefined) write(KEYS.draft, d.draft);
    if (Array.isArray(d.clients)) write(KEYS.clients, d.clients);
    if (Array.isArray(d.expenses)) write(KEYS.expenses, d.expenses);
    if (Array.isArray(d.recurring)) write(KEYS.recurring, d.recurring);
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  Object.values(KEYS).forEach((key) => remove(key));
}

// Re-export types for convenience
export type { ClientData } from '@/lib/types';
