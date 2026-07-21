import { create } from 'zustand';
import type { InvoiceFormData, InvoiceItemData, BusinessProfileData, AppSettingsData } from '@/lib/types';
import { calculateItemAmount, calculateSubtotal, calculateTaxAmount, calculateDiscountAmount, calculateTotal } from '@/lib/calculations';
import { getProfile, saveProfile, getSettings, saveSettings, getInvoices, getDraft, saveDraft } from '@/lib/local-storage';

function createEmptyItem(sno: number): InvoiceItemData {
  return { id: crypto.randomUUID(), sno, description: '', pack: '', qty: 0, mrp: 0, rate: 0, amount: 0 };
}

const today = () => new Date().toISOString().split('T')[0];

const defaultFormData: InvoiceFormData = {
  invoiceNumber: 1,
  date: today(),
  dueDate: '',
  clientName: '',
  clientMobile: '',
  clientAddress: '',
  clientGstin: '',
  items: [createEmptyItem(1)],
  subtotal: 0,
  taxEnabled: false,
  taxRate: 18,
  taxAmount: 0,
  discountEnabled: false,
  discountType: 'flat',
  discountValue: 0,
  discountAmount: 0,
  totalAmount: 0,
  amountInWords: '',
  preparedBy: '',
  checkedBy: '',
  receivedBy: '',
  notes: '',
  template: 'classic',
  includeQr: false,
  includeSignature: false,
  documentType: 'invoice',
  validUntil: '',
  paymentMethod: '',
};

interface InvoiceFormState {
  formData: InvoiceFormData;
  profile: BusinessProfileData;
  settings: AppSettingsData;
  isDirty: boolean;
  lastAutoSave: Date | null;
  initialized: boolean;

  initializeFromStorage: () => void;
  updateForm: (updates: Partial<InvoiceFormData>) => void;
  updateItem: (index: number, field: keyof InvoiceItemData, value: string | number | boolean) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  resetForm: () => void;
  setProfile: (profile: Partial<BusinessProfileData>) => void;
  setSettings: (settings: Partial<AppSettingsData>) => void;
  markClean: () => void;
  setAutoSaveDate: (date: Date) => void;
}

export const useInvoiceFormStore = create<InvoiceFormState>((set, get) => ({
  formData: defaultFormData,
  profile: { companyName: 'My Business', address: '', mobile: '', email: '', gstin: '', pan: '', bankName: '', bankAccount: '', bankIfsc: '', upiId: '', logoPath: '', signaturePath: '', termsConditions: '' },
  settings: { darkMode: false, defaultTemplate: 'classic', autoSave: true, autoSaveInterval: 30, taxDefault: true, taxRateDefault: 18, currency: 'INR', recurringEnabled: false, qrEnabled: false, signatureEnabled: false, invoicePrefix: 'INV-', invoiceDigits: 4 },
  isDirty: false,
  lastAutoSave: null,
  initialized: false,

  initializeFromStorage: () => {
    if (typeof window === 'undefined') return;
    const storedProfile = getProfile();
    const storedSettings = getSettings();
    const invoices = getInvoices();
    const maxNum = invoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 0), 0);
    const draft = getDraft();
    
    set({
      profile: storedProfile,
      settings: storedSettings,
      formData: draft && draft.items?.length > 0 
        ? { ...defaultFormData, ...draft, invoiceNumber: maxNum + 1 }
        : { ...defaultFormData, invoiceNumber: maxNum + 1 },
      initialized: true,
    });
  },

  updateForm: (updates) => {
    const state = get();
    const newFormData = { ...state.formData, ...updates };
    const items = newFormData.items.map((item) => ({
      ...item,
      amount: calculateItemAmount(item),
    }));
    const subtotal = calculateSubtotal(items);
    const taxAmount = calculateTaxAmount(subtotal, newFormData.taxEnabled, newFormData.taxRate);
    const discountAmount = calculateDiscountAmount(subtotal, newFormData.discountEnabled, newFormData.discountType, newFormData.discountValue);
    const totalAmount = calculateTotal(subtotal, taxAmount, discountAmount);

    set({
      formData: { ...newFormData, items, subtotal, taxAmount, discountAmount, totalAmount },
      isDirty: true,
    });
  },

  updateItem: (index, field, value) => {
    const state = get();
    const items = [...state.formData.items];
    items[index] = { ...items[index], [field]: value };
    items[index] = { ...items[index], amount: calculateItemAmount(items[index]) };
    const subtotal = calculateSubtotal(items);
    const taxAmount = calculateTaxAmount(subtotal, state.formData.taxEnabled, state.formData.taxRate);
    const discountAmount = calculateDiscountAmount(subtotal, state.formData.discountEnabled, state.formData.discountType, state.formData.discountValue);
    const totalAmount = calculateTotal(subtotal, taxAmount, discountAmount);

    set({
      formData: { ...state.formData, items, subtotal, taxAmount, discountAmount, totalAmount },
      isDirty: true,
    });
  },

  addItem: () => {
    const state = get();
    const items = [...state.formData.items, createEmptyItem(state.formData.items.length + 1)];
    set({ formData: { ...state.formData, items }, isDirty: true });
  },

  removeItem: (index) => {
    const state = get();
    if (state.formData.items.length <= 1) return;
    const items = state.formData.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sno: i + 1 }));
    const subtotal = calculateSubtotal(items);
    const taxAmount = calculateTaxAmount(subtotal, state.formData.taxEnabled, state.formData.taxRate);
    const discountAmount = calculateDiscountAmount(subtotal, state.formData.discountEnabled, state.formData.discountType, state.formData.discountValue);
    const totalAmount = calculateTotal(subtotal, taxAmount, discountAmount);
    set({ formData: { ...state.formData, items, subtotal, taxAmount, discountAmount, totalAmount }, isDirty: true });
  },

  resetForm: () => {
    const invoices = getInvoices();
    const maxNum = invoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 0), 0);
    set({ formData: { ...defaultFormData, items: [createEmptyItem(1)], date: today(), invoiceNumber: maxNum + 1 }, isDirty: false });
  },

  setProfile: (profileUpdate) => {
    const state = get();
    const updated = { ...state.profile, ...profileUpdate };
    saveProfile(updated);
    set({ profile: updated });
  },

  setSettings: (settingsUpdate) => {
    const state = get();
    const updated = { ...state.settings, ...settingsUpdate };
    saveSettings(updated);
    set({ settings: updated });
  },

  markClean: () => set({ isDirty: false }),
  setAutoSaveDate: (date) => set({ lastAutoSave: date }),
}));
