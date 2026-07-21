import { create } from 'zustand';
import type { AppView } from '@/lib/types';

interface AppState {
  currentView: AppView;
  sidebarOpen: boolean;
  selectedInvoice: string | null;
  setView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedInvoice: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  sidebarOpen: false,
  selectedInvoice: null,
  setView: (view) => set({ currentView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedInvoice: (id) => set({ selectedInvoice: id }),
}));
