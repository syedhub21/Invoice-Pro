'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Search, Trash2, Eye, FilePen, Filter, FileText, CheckCircle, ArrowUpDown, X, RefreshCw, Clock, Receipt, CircleDollarSign, FileEdit, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatInvoiceNumber, formatAmount } from '@/lib/utils';
import { getInvoices, deleteInvoice, updateInvoiceStatus } from '@/lib/local-storage';
import type { InvoiceListItem, DocumentType } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'paid': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Paid</Badge>;
    case 'finalized': return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0">Finalized</Badge>;
    case 'draft': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Draft</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function DocTypeBadge({ documentType }: { documentType?: DocumentType }) {
  switch (documentType) {
    case 'estimate': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Estimate</Badge>;
    case 'quotation': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">Quotation</Badge>;
    default: return null;
  }
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 0.6) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v: number) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(motionVal, target, { duration });
    const unsub = rounded.on('change', (v: number) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [target, duration, motionVal, rounded]);
  return display;
}

// Count badge with animated counter
function AnimatedCountBadge({ label, count, icon: Icon, colorClass, bgColorClass }: {
  label: string; count: number; icon: React.ElementType; colorClass: string; bgColorClass: string;
}) {
  const animated = useAnimatedCounter(count);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${bgColorClass} border shadow-sm`}
    >
      <div className={`size-8 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-none">{animated}</p>
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

// Container variants for staggered animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function InvoiceHistory() {
  const { setView, setSelectedInvoice } = useAppStore();
  const { settings } = useInvoiceFormStore();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [batchDeleteIds, setBatchDeleteIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const listRef = useRef<HTMLDivElement>(null);

  // Load invoices from localStorage
  const refreshInvoices = useCallback(() => {
    setIsRefreshing(true);
    const data = getInvoices();
    setInvoices(data);
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  useEffect(() => {
    refreshInvoices();
  }, [refreshInvoices]);

  const filtered = useMemo(() => {
    let result = invoices.filter((inv) => {
      const matchesSearch = !search || 
        inv.clientName.toLowerCase().includes(search.toLowerCase()) || 
        formatInvoiceNumber(inv.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits).toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'amount') return b.totalAmount - a.totalAmount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
    });

    return result;
  }, [invoices, search, statusFilter, sortBy, settings.invoicePrefix, settings.invoiceDigits]);

  // Status counts for summary bar
  const statusCounts = useMemo(() => ({
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    finalized: invoices.filter(i => i.status === 'finalized').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  }), [invoices]);

  const handleDelete = () => {
    if (!deleteId) return;
    deleteInvoice(deleteId);
    setInvoices(prev => prev.filter(inv => inv.id !== deleteId));
    toast.success('Invoice deleted');
    setDeleteId(null);
  };

  const handleBatchDelete = () => {
    selectedIds.forEach(id => deleteInvoice(id));
    setInvoices(prev => prev.filter(inv => !selectedIds.has(inv.id)));
    toast.success(`${selectedIds.size} invoice(s) deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
    setBatchDeleteIds([]);
  };

  const handleBatchMarkPaid = () => {
    let count = 0;
    selectedIds.forEach(id => {
      const inv = invoices.find(i => i.id === id);
      if (inv && inv.status === 'finalized') {
        updateInvoiceStatus(id, 'paid');
        count++;
      }
    });
    if (count > 0) {
      setInvoices(getInvoices());
      toast.success(`${count} invoice(s) marked as paid`);
    } else {
      toast.info('No finalized invoices selected');
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleView = (id: string) => { setSelectedInvoice(id); setView('preview'); };

  const handleEdit = (inv: InvoiceListItem) => {
    // Load invoice into form store for editing
    const store = useInvoiceFormStore.getState();
    const fullInvoice = getInvoices().find(i => i.id === inv.id);
    if (fullInvoice) {
      // We'll navigate to preview for now (editing is complex)
      setSelectedInvoice(inv.id);
      setView('preview');
    }
  };

  const handleMarkPaid = (id: string) => {
    updateInvoiceStatus(id, 'paid');
    setInvoices(getInvoices());
    toast.success('Invoice marked as paid');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map(i => i.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const statusColorMap: Record<string, string> = {
    draft: 'border-l-amber-500',
    finalized: 'border-l-blue-500',
    paid: 'border-l-emerald-500',
  };

  return (
    <div className="space-y-4">
      {/* Header with gradient bar */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
              <FileText className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Invoice History</h1>
              <p className="text-xs text-muted-foreground">Manage and track your invoices</p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className={`text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`}
                  onClick={refreshInvoices}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh invoices</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant={selectMode ? "default" : "outline"} size="sm"
            className={selectMode ? "bg-emerald-600 text-white" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>
            {selectMode ? <><X className="size-3.5 mr-1" />Cancel</> : <><CheckCircle className="size-3.5 mr-1" />Select</>}
          </Button>
        </div>
      </div>

      {/* Animated Count Badges */}
      <div className="grid grid-cols-4 gap-2">
        <AnimatedCountBadge label="Total" count={statusCounts.all} icon={Archive} colorClass="bg-emerald-100 text-emerald-600" bgColorClass="bg-card" />
        <AnimatedCountBadge label="Paid" count={statusCounts.paid} icon={CircleDollarSign} colorClass="bg-emerald-100 text-emerald-600" bgColorClass="bg-card" />
        <AnimatedCountBadge label="Pending" count={statusCounts.finalized} icon={Clock} colorClass="bg-sky-100 text-sky-600" bgColorClass="bg-card" />
        <AnimatedCountBadge label="Draft" count={statusCounts.draft} icon={FileEdit} colorClass="bg-amber-100 text-amber-600" bgColorClass="bg-card" />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'finalized', 'paid'] as const).map(s => {
          const pillColors: Record<string, string> = {
            all: 'bg-emerald-600',
            draft: 'bg-amber-500',
            finalized: 'bg-sky-500',
            paid: 'bg-emerald-500',
          };
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                statusFilter === s
                  ? `${pillColors[s]} text-white shadow-md scale-105`
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:scale-102'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`rounded-full px-1.5 text-[10px] ${statusFilter === s ? 'bg-white/25' : 'bg-black/5'}`}>
                {statusCounts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filters with gradient accent */}
      <div className="relative">
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 rounded-full opacity-40" />
        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-9" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'oldest' | 'amount')}>
                  <SelectTrigger className={`w-32 transition-shadow ${sortBy !== 'newest' ? 'ring-2 ring-emerald-300 shadow-sm' : ''}`}>
                    <ArrowUpDown className={`size-4 mr-1 ${sortBy !== 'newest' ? 'text-emerald-600' : ''}`} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent>Sort order</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Select All / Deselect */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
              <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs">Deselect All</Button>
              {selectedIds.size > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">{selectedIds.size} selected</Badge>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice List */}
      <div ref={listRef} className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-16"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/40 via-teal-200/30 to-amber-200/40 rounded-full blur-2xl scale-150" />
                <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-8 border border-emerald-100 dark:border-emerald-900">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <FileText className="size-8 text-emerald-400" />
                    <Receipt className="size-6 text-teal-400" />
                    <Archive className="size-7 text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">No invoices found</p>
                  <p className="text-xs text-muted-foreground/70 mb-4">Create your first invoice to get started</p>
                  <Button variant="default" size="sm"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    onClick={() => setView('new-invoice')}>
                    <FileText className="size-3.5 mr-1" /> Create Invoice
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {filtered.map((invoice, i) => (
                <motion.div key={invoice.id} variants={itemVariants}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}>
                  <Card className={`
                    group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-l-4 cursor-pointer
                    ${statusColorMap[invoice.status] || 'border-l-gray-300'}
                    ${selectedIds.has(invoice.id) ? 'ring-2 ring-emerald-500 shadow-md' : ''}
                    ${selectMode && i % 2 === 1 ? 'bg-muted/30' : ''}
                  `}
                    onClick={() => !selectMode && handleView(invoice.id)}
                    >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {selectMode && (
                            <Checkbox checked={selectedIds.has(invoice.id)} onCheckedChange={() => toggleSelect(invoice.id)}
                              className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              onClick={(e) => e.stopPropagation()} />
                          )}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}</span>
                              <StatusBadge status={invoice.status} />
                              <DocTypeBadge documentType={invoice.documentType} />
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{invoice.clientName || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(invoice.createdAt), 'dd MMM yyyy')}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-2">
                          <p className="font-semibold text-sm">{formatAmount(invoice.totalAmount, settings.currency)}</p>
                          {!selectMode && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                      onClick={(e) => { e.stopPropagation(); handleView(invoice.id); }}>
                                      <Eye className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View invoice</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {invoice.status === 'finalized' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                        onClick={(e) => { e.stopPropagation(); handleMarkPaid(invoice.id); }}>
                                        <CheckCircle className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mark as paid</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => { e.stopPropagation(); setDeleteId(invoice.id); }}>
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete invoice</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with count and last updated */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {invoices.length} invoices</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Updated {format(lastUpdated, 'HH:mm')}
          </span>
        </div>
      )}

      {/* Floating batch action bar with slide-in */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-20 left-0 right-0 z-50 px-4"
          >
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 rounded-xl border bg-background/95 backdrop-blur-lg shadow-xl p-3 ring-1 ring-emerald-200/50">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="size-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  onClick={handleBatchMarkPaid}>
                  <CheckCircle className="size-3.5 mr-1" /> Mark Paid
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBatchDelete}>
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
