// ─── Invoice Types ─────────────────────────────────────────────

export interface InvoiceItemData {
  id: string;
  sno: number;
  description: string;
  pack: string;
  qty: number;
  mrp: number;
  rate: number;
  amount: number;
}

export type DocumentType = 'invoice' | 'estimate' | 'quotation';

export interface InvoiceFormData {
  id?: string;
  invoiceNumber: number;
  date: string;
  dueDate: string;
  clientName: string;
  clientMobile: string;
  clientAddress: string;
  clientGstin: string;
  items: InvoiceItemData[];
  subtotal: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  discountEnabled: boolean;
  discountType: 'flat' | 'percent';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  amountInWords: string;
  preparedBy: string;
  checkedBy: string;
  receivedBy: string;
  notes: string;
  template: 'classic' | 'modern';
  includeQr: boolean;
  includeSignature: boolean;
  /** If true, this is an estimate/quotation, not an invoice */
  isEstimate?: boolean;
  /** Currency code for this invoice (INR, USD, etc.) */
  currency?: string;
  /** Document type: invoice, estimate, or quotation */
  documentType?: DocumentType;
  /** Valid until date (for quotations) */
  validUntil?: string;
  /** Payment method (for receipts) */
  paymentMethod?: string;
}

export interface BusinessProfileData {
  id?: string;
  companyName: string;
  address: string;
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  upiId: string;
  logoPath: string;
  signaturePath: string;
  termsConditions: string;
}

export interface AppSettingsData {
  darkMode: boolean;
  defaultTemplate: string;
  autoSave: boolean;
  autoSaveInterval: number;
  taxDefault: boolean;
  taxRateDefault: number;
  currency: string;
  recurringEnabled: boolean;
  qrEnabled: boolean;
  signatureEnabled: boolean;
  invoicePrefix: string;
  invoiceDigits: number;
}

export interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  notes: string;
  createdAt: string;
}

export interface ClientData {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  createdAt: string;
  updatedAt: string;
}

export type AppView = 'home' | 'new-invoice' | 'history' | 'settings' | 'preview' | 'recurring' | 'clients' | 'expenses' | 'reports' | 'search' | 'estimates';

export interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  recentInvoices: InvoiceListItem[];
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: number;
  clientName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  dueDate?: string;
  finalizedDate?: string;
  paidDate?: string;
  /** Document type: invoice, estimate, or quotation */
  documentType?: DocumentType;
  /** Valid until date (for quotations) */
  validUntil?: string;
  /** Payment method (for receipts) */
  paymentMethod?: string;
}

export interface RecurringInvoiceData {
  id?: string;
  name: string;
  frequency: string;
  dayOfWeek: number;
  dayOfMonth: number;
  monthOfYear: number;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  lastGenerated?: string;
  active: boolean;
  templateData: string;
}
