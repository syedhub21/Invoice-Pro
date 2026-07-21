'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search, FileText, Users, Wallet, ArrowRight, X, Filter, Clock, Sparkles,
} from 'lucide-react';
import {
  Card, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { getInvoices, getClients, getExpenses } from '@/lib/local-storage';
import { formatAmount, formatInvoiceNumber } from '@/lib/utils';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { useAppStore } from '@/store/app-store';
import type { InvoiceListItem, ClientData, ExpenseData } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────
type SearchCategory = 'all' | 'invoices' | 'clients' | 'expenses';

// ─── Recent Searches (localStorage) ─────────────────────────
const RECENT_SEARCHES_KEY = 'invoicepro_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentSearch(query: string): void {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter((s) => s !== query.trim());
  recent.unshift(query.trim());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ─── Expense Category Colors ────────────────────────────────
const EXPENSE_CATEGORY_COLORS: Record<string, {
  badge: string;
  badgeText: string;
  dot: string;
}> = {
  Rent: { badge: 'bg-rose-100 dark:bg-rose-950/40', badgeText: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  Utilities: { badge: 'bg-sky-100 dark:bg-sky-950/40', badgeText: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  Supplies: { badge: 'bg-amber-100 dark:bg-amber-950/40', badgeText: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  Travel: { badge: 'bg-violet-100 dark:bg-violet-950/40', badgeText: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  Food: { badge: 'bg-orange-100 dark:bg-orange-950/40', badgeText: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  Marketing: { badge: 'bg-pink-100 dark:bg-pink-950/40', badgeText: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500' },
  Software: { badge: 'bg-teal-100 dark:bg-teal-950/40', badgeText: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
  Salaries: { badge: 'bg-emerald-100 dark:bg-emerald-950/40', badgeText: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  Maintenance: { badge: 'bg-slate-100 dark:bg-slate-950/40', badgeText: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
  Other: { badge: 'bg-gray-100 dark:bg-gray-950/40', badgeText: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
};

function getExpenseCategoryStyle(category: string) {
  return EXPENSE_CATEGORY_COLORS[category] || EXPENSE_CATEGORY_COLORS.Other;
}

// ─── Sub-components ─────────────────────────────────────────

/** InvoiceStatusBadge — Paid (emerald), Finalized (sky), Draft (amber) */
function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string }> = {
    paid: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    finalized: { className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
    draft: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  };
  const c = config[status.toLowerCase()] || config.draft;
  return (
    <Badge variant="secondary" className={`text-[10px] font-medium capitalize ${c.className}`}>
      {status}
    </Badge>
  );
}

/** CategoryPill — Filter pills with count badges, emerald active state */
function CategoryPill({
  label,
  icon: Icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="size-3.5" />
      {label}
      {count > 0 && (
        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
          active
            ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
            : 'bg-muted-foreground/10 text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

/** InvoiceResultCard — Card with emerald left border */
function InvoiceResultCard({
  invoice,
  currencyCode,
  onClick,
}: {
  invoice: InvoiceListItem & { status: string };
  currencyCode: string;
  onClick: () => void;
}) {
  const { settings } = useInvoiceFormStore();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Card
        className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Invoice number + status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}
                </span>
                <InvoiceStatusBadge status={invoice.status} />
              </div>

              {/* Client name */}
              <p className="text-sm text-muted-foreground truncate">{invoice.clientName}</p>

              {/* Amount + date */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatAmount(invoice.totalAmount, currencyCode)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {invoice.createdAt ? format(new Date(invoice.createdAt), 'dd MMM yyyy') : ''}
                </span>
              </div>
            </div>

            <ArrowRight className="size-4 text-muted-foreground/50 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** ClientResultCard — Card with violet left border */
function ClientResultCard({
  client,
  onClick,
}: {
  client: ClientData;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Card
        className="border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Name + GSTIN badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{client.name}</span>
                {client.gstin && (
                  <Badge variant="secondary" className="text-[10px] font-mono bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    {client.gstin}
                  </Badge>
                )}
              </div>

              {/* Mobile */}
              {client.mobile && (
                <p className="text-xs text-muted-foreground">{client.mobile}</p>
              )}

              {/* Address */}
              {client.address && (
                <p className="text-xs text-muted-foreground truncate">{client.address}</p>
              )}
            </div>

            <ArrowRight className="size-4 text-muted-foreground/50 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** ExpenseResultCard — Card with rose left border */
function ExpenseResultCard({
  expense,
  currencyCode,
  onClick,
}: {
  expense: ExpenseData;
  currencyCode: string;
  onClick: () => void;
}) {
  const catStyle = getExpenseCategoryStyle(expense.category);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Card
        className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Description + category badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{expense.description}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle.badge} ${catStyle.badgeText}`}>
                  <span className={`size-1.5 rounded-full ${catStyle.dot}`} />
                  {expense.category}
                </span>
              </div>

              {/* Notes */}
              {expense.notes && (
                <p className="text-xs text-muted-foreground line-clamp-1">{expense.notes}</p>
              )}

              {/* Amount + date */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {formatAmount(expense.amount, currencyCode)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {expense.date ? format(new Date(expense.date), 'dd MMM yyyy') : ''}
                </span>
              </div>
            </div>

            <ArrowRight className="size-4 text-muted-foreground/50 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** TypeHeader — Section header with icon, count badge, color variant */
function TypeHeader({
  icon: Icon,
  title,
  count,
  variant,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  variant: 'emerald' | 'violet' | 'rose';
}) {
  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    violet: 'text-violet-600 dark:text-violet-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  const badgeMap = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`size-4 ${colorMap[variant]}`} />
      <h3 className="text-sm font-semibold">{title}</h3>
      <Badge variant="secondary" className={`text-[10px] font-bold ${badgeMap[variant]}`}>
        {count}
      </Badge>
    </div>
  );
}

// ─── Animation Variants ─────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ─── Main GlobalSearch Component ────────────────────────────
export function GlobalSearch() {
  const { settings } = useInvoiceFormStore();
  const { setView, setSelectedInvoice } = useAppStore();
  const currencyCode = settings.currency;

  // Data
  const [invoices] = useState<InvoiceListItem[]>(() => getInvoices());
  const [clients] = useState<ClientData[]>(() => getClients());
  const [expenses] = useState<ExpenseData[]>(() => getExpenses());

  // Search state
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear recent searches dialog
  const [isClearRecentOpen, setIsClearRecentOpen] = useState(false);

  // ─── Ctrl+K shortcut ──────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Search Logic ─────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!query.trim()) return { invoices: [], clients: [], expenses: [] };
    const q = query.toLowerCase();

    const filteredInvoices = invoices.filter((inv) => {
      if (category !== 'all' && category !== 'invoices') return false;
      return (
        inv.clientName.toLowerCase().includes(q) ||
        formatInvoiceNumber(inv.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits).toLowerCase().includes(q)
      );
    });

    const filteredClients = clients.filter((c) => {
      if (category !== 'all' && category !== 'clients') return false;
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });

    const filteredExpenses = expenses.filter((e) => {
      if (category !== 'all' && category !== 'expenses') return false;
      return (
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    });

    return { invoices: filteredInvoices, clients: filteredClients, expenses: filteredExpenses };
  }, [query, category, invoices, clients, expenses, settings.invoicePrefix, settings.invoiceDigits]);

  const totalResults = searchResults.invoices.length + searchResults.clients.length + searchResults.expenses.length;

  // ─── Handlers ─────────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      saveRecentSearch(value);
      setRecentSearches(getRecentSearches());
    }
  }, []);

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());
    inputRef.current?.focus();
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
    setIsClearRecentOpen(false);
  }, []);

  const handleInvoiceClick = useCallback((id: string) => {
    setSelectedInvoice(id);
    setView('preview');
  }, [setSelectedInvoice, setView]);

  const handleClientClick = useCallback((_id: string) => {
    setView('clients');
  }, [setView]);

  const handleExpenseClick = useCallback((_id: string) => {
    setView('expenses');
  }, [setView]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  // ─── Counts for category pills ────────────────────────────
  const allCount = invoices.length + clients.length + expenses.length;

  const showResults = query.trim().length > 0;
  const showEmpty = showResults && totalResults === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/20">
          <Sparkles className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Global Search</h2>
          <p className="text-sm text-muted-foreground">Search across invoices, clients & expenses</p>
        </div>
      </motion.div>

      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search invoices, clients, expenses..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-12 pr-20 py-3 text-base rounded-xl border-2 border-muted focus:border-emerald-500 focus:ring-emerald-500/20 transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={handleClearSearch}
            >
              <X className="size-4" />
            </Button>
          )}
          <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0.5 hidden sm:inline-flex">
            Ctrl+K
          </Badge>
        </div>
      </motion.div>

      {/* Category Filter Pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <Filter className="size-3.5 text-muted-foreground" />
        <CategoryPill
          label="All"
          icon={Search}
          count={allCount}
          active={category === 'all'}
          onClick={() => setCategory('all')}
        />
        <CategoryPill
          label="Invoices"
          icon={FileText}
          count={invoices.length}
          active={category === 'invoices'}
          onClick={() => setCategory('invoices')}
        />
        <CategoryPill
          label="Clients"
          icon={Users}
          count={clients.length}
          active={category === 'clients'}
          onClick={() => setCategory('clients')}
        />
        <CategoryPill
          label="Expenses"
          icon={Wallet}
          count={expenses.length}
          active={category === 'expenses'}
          onClick={() => setCategory('expenses')}
        />
      </motion.div>

      <Separator />

      {/* ── Recent Searches (shown when no query) ── */}
      {!showResults && recentSearches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Searches</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-rose-600"
              onClick={() => setIsClearRecentOpen(true)}
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleRecentClick(term)}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Clock className="size-3" />
                {term}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Empty State: No query entered ── */}
      {!showResults && recentSearches.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-950/30 dark:to-violet-950/20 p-8 mb-4">
            <Sparkles className="size-14 text-emerald-400/60" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Search Anything</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Find invoices, clients, and expenses instantly. Press Ctrl+K to focus search.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/40 p-2">
                <FileText className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Invoices</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-lg bg-violet-100 dark:bg-violet-950/40 p-2">
                <Users className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Clients</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-lg bg-rose-100 dark:bg-rose-950/40 p-2">
                <Wallet className="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Expenses</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Search Results ── */}
      <AnimatePresence mode="wait">
        {showResults && !showEmpty && (
          <motion.div
            key="results"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="space-y-6 max-h-[calc(100vh-380px)] overflow-y-auto pr-1"
          >
            {/* Invoices section */}
            {searchResults.invoices.length > 0 && (category === 'all' || category === 'invoices') && (
              <div>
                <TypeHeader icon={FileText} title="Invoices" count={searchResults.invoices.length} variant="emerald" />
                <motion.div variants={containerVariants} className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {searchResults.invoices.map((inv) => (
                      <motion.div key={inv.id} variants={itemVariants}>
                        <InvoiceResultCard
                          invoice={inv as InvoiceListItem & { status: string }}
                          currencyCode={currencyCode}
                          onClick={() => handleInvoiceClick(inv.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            {/* Clients section */}
            {searchResults.clients.length > 0 && (category === 'all' || category === 'clients') && (
              <div>
                <TypeHeader icon={Users} title="Clients" count={searchResults.clients.length} variant="violet" />
                <motion.div variants={containerVariants} className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {searchResults.clients.map((c) => (
                      <motion.div key={c.id} variants={itemVariants}>
                        <ClientResultCard client={c} onClick={() => handleClientClick(c.id)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            {/* Expenses section */}
            {searchResults.expenses.length > 0 && (category === 'all' || category === 'expenses') && (
              <div>
                <TypeHeader icon={Wallet} title="Expenses" count={searchResults.expenses.length} variant="rose" />
                <motion.div variants={containerVariants} className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {searchResults.expenses.map((e) => (
                      <motion.div key={e.id} variants={itemVariants}>
                        <ExpenseResultCard expense={e} currencyCode={currencyCode} onClick={() => handleExpenseClick(e.id)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            {/* Result count footer */}
            <motion.div variants={itemVariants} className="pt-2">
              <Separator className="mb-3" />
              <p className="text-xs text-muted-foreground text-center">
                {totalResults} result{totalResults !== 1 ? 's' : ''} found
                {searchResults.invoices.length > 0 && ` · ${searchResults.invoices.length} invoice${searchResults.invoices.length !== 1 ? 's' : ''}`}
                {searchResults.clients.length > 0 && ` · ${searchResults.clients.length} client${searchResults.clients.length !== 1 ? 's' : ''}`}
                {searchResults.expenses.length > 0 && ` · ${searchResults.expenses.length} expense${searchResults.expenses.length !== 1 ? 's' : ''}`}
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ── No Results State ── */}
        {showEmpty && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="rounded-2xl bg-gradient-to-br from-muted to-muted/50 p-8 mb-4">
              <Search className="size-14 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              No matching invoices, clients, or expenses for &quot;{query}&quot;
            </p>
            <Button variant="outline" onClick={handleClearSearch}>
              <X className="size-4 mr-1.5" />
              Clear Search
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear Recent Searches Confirmation Dialog ── */}
      <Dialog open={isClearRecentOpen} onOpenChange={setIsClearRecentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear Recent Searches</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all recent search history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsClearRecentOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearRecent}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
