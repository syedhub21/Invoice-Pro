'use client';

import React, { useEffect, useCallback, useSyncExternalStore, useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, FilePlus, History, Settings, Menu, Sun, Moon, RefreshCw, FileText, Users, Wallet, Scale, Search, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Dashboard } from '@/components/invoice/dashboard';
import InvoiceForm from '@/components/invoice/invoice-form';
import InvoiceHistory from '@/components/invoice/invoice-history';
import SettingsView from '@/components/invoice/settings-view';
import InvoicePreview from '@/components/invoice/invoice-preview';
import RecurringInvoices from '@/components/invoice/recurring-invoices';
import ClientManagement from '@/components/invoice/client-management';
import { ExpenseTracker } from '@/components/invoice/expense-tracker';
import { ProfitLossReport } from '@/components/invoice/profit-loss-report';
import { GlobalSearch } from '@/components/invoice/global-search';
import { BottomNav } from '@/components/invoice/bottom-nav';
import { InstallPrompt } from '@/components/invoice/install-prompt';
import { getCurrencyConfig } from '@/lib/utils';
import { getInvoices } from '@/lib/local-storage';

import type { AppView } from '@/lib/types';

interface NavItem { label: string; view: AppView; icon: React.ElementType; section?: string }

const navItems: NavItem[] = [
  { label: 'Home', view: 'home', icon: LayoutDashboard, section: 'main' },
  { label: 'New Invoice', view: 'new-invoice', icon: FilePlus, section: 'main' },
  { label: 'History', view: 'history', icon: History, section: 'main' },
  { label: 'Clients', view: 'clients', icon: Users, section: 'manage' },
  { label: 'Expenses', view: 'expenses', icon: Wallet, section: 'manage' },
  { label: 'P&L Report', view: 'reports', icon: Scale, section: 'manage' },
  { label: 'Recurring', view: 'recurring', icon: RefreshCw, section: 'tools' },
  { label: 'Settings', view: 'settings', icon: Settings, section: 'tools' },
];

const SECTION_LABELS: Record<string, string> = {
  main: 'Navigation',
  manage: 'Manage',
  tools: 'Tools',
};

const SECTION_COLORS: Record<string, string> = {
  main: 'from-emerald-600 to-emerald-500',
  manage: 'from-violet-600 to-violet-500',
  tools: 'from-amber-600 to-amber-500',
};

const emptySubscribe = () => () => {};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!mounted) return <Button variant="ghost" size="icon" aria-label="Toggle theme"><Sun className="size-5" /></Button>;
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

export function AppShell() {
  const { currentView, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  const { settings } = useInvoiceFormStore();
  const currencyConfig = getCurrencyConfig(settings.currency);

  // Track scroll for header shadow
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Check for overdue invoices (for notification dot)
  const overdueCount = useMemo(() => {
    const invoices = getInvoices();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return invoices.filter(inv => {
      if (inv.status === 'paid' || !inv.dueDate) return false;
      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;
  }, [currentView]);

  const handleNavClick = (view: AppView) => { setView(view); setSidebarOpen(false); };

  // Keyboard shortcut: Ctrl+K to open search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setView('search');
    }
  }, [setView]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderView = () => {
    switch (currentView) {
      case 'home': return <Dashboard />;
      case 'new-invoice': return <InvoiceForm />;
      case 'history': return <InvoiceHistory />;
      case 'settings': return <SettingsView />;
      case 'preview': return <InvoicePreview />;
      case 'recurring': return <RecurringInvoices />;
      case 'clients': return <ClientManagement />;
      case 'expenses': return <ExpenseTracker />;
      case 'reports': return <ProfitLossReport />;
      case 'search': return <GlobalSearch />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className={`sticky top-0 z-40 w-full backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 bg-background/80 transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        {/* Emerald gradient accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500" />
        <div className="flex h-14 items-center px-4 gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" aria-label="Open navigation menu"
            onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 shadow-sm">
              <FileText className="size-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent hidden sm:block">
              InvoicePro
            </h1>
          </div>

          {/* Currency badge */}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 gap-1 font-mono">
            <Globe className="size-2.5" />
            {currencyConfig.code}
          </Badge>

          {/* Offline badge */}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 dark:bg-emerald-600/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse [animation-duration:2s]" />
            Offline
          </span>

          <div className="flex-1" />

          {/* Search button with keyboard shortcut */}
          <div className="relative hidden sm:flex">
            <Button variant="ghost" size="sm" className="items-center gap-2 text-muted-foreground h-8 px-3 border border-dashed border-muted-foreground/30 rounded-lg hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => setView('search')}>
              <Search className="size-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3.5 bg-rose-500 text-[6px] text-white font-bold items-center justify-center">
                  {overdueCount > 9 ? '9+' : overdueCount}
                </span>
              </span>
            )}
          </div>

          {/* Mobile search button */}
          <div className="relative sm:hidden">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600"
              onClick={() => setView('search')}>
              <Search className="size-5" />
            </Button>
            {overdueCount > 0 && (
              <span className="absolute top-1 right-1 flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-rose-500" />
              </span>
            )}
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Navigation Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          {/* Gradient header for sidebar */}
          <SheetHeader className="relative p-6 pb-4 border-b bg-gradient-to-br from-emerald-600/10 via-teal-500/5 to-transparent">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 shadow-sm">
                <FileText className="size-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  InvoicePro
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">Offline Invoice Generator</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto flex-1">
            {navItems.map((item, idx) => {
              const isActive = currentView === item.view;
              const Icon = item.icon;
              const showSection = idx === 0 || navItems[idx - 1].section !== item.section;
              return (
                <React.Fragment key={item.view}>
                  {showSection && idx > 0 && (
                    <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60`}>{SECTION_LABELS[item.section ?? 'main']}</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                  )}
                  <motion.button
                    onClick={() => handleNavClick(item.view)}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 w-full text-left
                      ${isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-600/25'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    aria-current={isActive ? 'page' : undefined}>
                    <div className={`flex items-center justify-center size-7 rounded-lg ${
                      isActive
                        ? 'bg-white/20'
                        : `bg-gradient-to-br ${SECTION_COLORS[item.section ?? 'main']} bg-opacity-10 opacity-30`
                    }`}>
                      <Icon className="size-4" />
                    </div>
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActiveIndicator"
                        className="ml-auto size-1.5 rounded-full bg-white/80"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </nav>
          <div className="p-3 border-t space-y-2">
            {/* Search shortcut */}
            <button
              onClick={() => { setView('search'); setSidebarOpen(false); }}
              className="flex items-center gap-2 w-full rounded-lg border border-dashed border-muted-foreground/20 px-3 py-2 text-xs text-muted-foreground hover:border-emerald-300 hover:text-emerald-600 transition-colors"
            >
              <Search className="size-3.5" />
              <span>Quick Search</span>
              <kbd className="ml-auto inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
            </button>
            <div className="flex items-center gap-1.5 px-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs text-muted-foreground">v2.0 &bull; Offline Ready</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div key={currentView}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={currentView === 'preview' ? 'h-full' : 'container mx-auto px-4 py-4 sm:py-6 max-w-5xl'}>
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer - desktop only */}
      <footer className="hidden md:block border-t bg-gradient-to-r from-background via-emerald-50/20 to-background dark:via-emerald-950/10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-5xl py-2 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-4 rounded bg-gradient-to-br from-emerald-600 to-teal-500">
                <FileText className="size-2.5 text-white" />
              </div>
              <p className="text-[11px] text-muted-foreground">InvoicePro v2.0</p>
              <span className="text-[11px] text-muted-foreground/40">•</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">100% Offline</span>
              <span className="text-[11px] text-muted-foreground/40">•</span>
              <span className="text-[11px] text-muted-foreground">{currencyConfig.code} {currencyConfig.symbol}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/50">Made with ❤️ for small businesses</p>
          </div>
        </div>
      </footer>

      {/* Bottom Nav - mobile only */}
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
