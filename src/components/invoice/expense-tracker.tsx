'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Plus, Search, Edit, Trash2, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getExpenses, saveExpense, deleteExpense, getExpenseStats } from '@/lib/local-storage';
import { formatAmount } from '@/lib/utils';
import { useInvoiceFormStore } from '@/store/invoice-store';
import type { ExpenseData } from '@/lib/types';

// ─── Category definitions with color maps ─────────────────────
const CATEGORIES = [
  { name: 'Rent', color: 'rose' },
  { name: 'Utilities', color: 'sky' },
  { name: 'Supplies', color: 'amber' },
  { name: 'Travel', color: 'violet' },
  { name: 'Food', color: 'orange' },
  { name: 'Marketing', color: 'pink' },
  { name: 'Software', color: 'teal' },
  { name: 'Salaries', color: 'emerald' },
  { name: 'Maintenance', color: 'slate' },
  { name: 'Other', color: 'gray' },
] as const;

type CategoryColor = (typeof CATEGORIES)[number]['color'];

const CATEGORY_STYLES: Record<CategoryColor, {
  border: string;
  badge: string;
  badgeText: string;
  dot: string;
  pill: string;
  pillText: string;
}> = {
  rose: {
    border: 'border-l-rose-500',
    badge: 'bg-rose-100 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    pill: 'bg-rose-100 dark:bg-rose-950/40',
    pillText: 'text-rose-700 dark:text-rose-300',
  },
  sky: {
    border: 'border-l-sky-500',
    badge: 'bg-sky-100 dark:bg-sky-950/40',
    badgeText: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    pill: 'bg-sky-100 dark:bg-sky-950/40',
    pillText: 'text-sky-700 dark:text-sky-300',
  },
  amber: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    pill: 'bg-amber-100 dark:bg-amber-950/40',
    pillText: 'text-amber-700 dark:text-amber-300',
  },
  violet: {
    border: 'border-l-violet-500',
    badge: 'bg-violet-100 dark:bg-violet-950/40',
    badgeText: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    pill: 'bg-violet-100 dark:bg-violet-950/40',
    pillText: 'text-violet-700 dark:text-violet-300',
  },
  orange: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-950/40',
    badgeText: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    pill: 'bg-orange-100 dark:bg-orange-950/40',
    pillText: 'text-orange-700 dark:text-orange-300',
  },
  pink: {
    border: 'border-l-pink-500',
    badge: 'bg-pink-100 dark:bg-pink-950/40',
    badgeText: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-500',
    pill: 'bg-pink-100 dark:bg-pink-950/40',
    pillText: 'text-pink-700 dark:text-pink-300',
  },
  teal: {
    border: 'border-l-teal-500',
    badge: 'bg-teal-100 dark:bg-teal-950/40',
    badgeText: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    pill: 'bg-teal-100 dark:bg-teal-950/40',
    pillText: 'text-teal-700 dark:text-teal-300',
  },
  emerald: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 dark:bg-emerald-950/40',
    pillText: 'text-emerald-700 dark:text-emerald-300',
  },
  slate: {
    border: 'border-l-slate-500',
    badge: 'bg-slate-100 dark:bg-slate-950/40',
    badgeText: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-500',
    pill: 'bg-slate-100 dark:bg-slate-950/40',
    pillText: 'text-slate-700 dark:text-slate-300',
  },
  gray: {
    border: 'border-l-gray-500',
    badge: 'bg-gray-100 dark:bg-gray-950/40',
    badgeText: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-500',
    pill: 'bg-gray-100 dark:bg-gray-950/40',
    pillText: 'text-gray-700 dark:text-gray-300',
  },
};

function getCategoryStyle(category: string) {
  const cat = CATEGORIES.find((c) => c.name === category);
  const color = cat ? cat.color : 'gray';
  return CATEGORY_STYLES[color];
}

// ─── Empty expense form ──────────────────────────────────────
function emptyExpense(): ExpenseData {
  return {
    id: crypto.randomUUID(),
    description: '',
    amount: 0,
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

// ─── Animation variants ──────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ─── Expense Tracker Component ────────────────────────────────
export function ExpenseTracker() {
  const { settings } = useInvoiceFormStore();
  const currencyCode = settings.currency;

  const [expenses, setExpenses] = useState<ExpenseData[]>(() => getExpenses());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);
  const [form, setForm] = useState<ExpenseData>(emptyExpense());

  // Delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseData | null>(null);

  // Stats
  const stats = useMemo(() => getExpenseStats(), [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [expenses, categoryFilter, searchQuery]);

  // ─── Form handlers ─────────────────────────────────────────
  const openAddDialog = useCallback(() => {
    setEditingExpense(null);
    setForm(emptyExpense());
    setIsFormOpen(true);
  }, []);

  const openEditDialog = useCallback((expense: ExpenseData) => {
    setEditingExpense(expense);
    setForm({ ...expense });
    setIsFormOpen(true);
  }, []);

  const openDeleteDialog = useCallback((expense: ExpenseData) => {
    setDeletingExpense(expense);
    setIsDeleteOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    const expenseToSave: ExpenseData = {
      ...form,
      description: form.description.trim(),
      notes: form.notes.trim(),
      createdAt: form.createdAt || new Date().toISOString(),
    };

    saveExpense(expenseToSave);
    setExpenses(getExpenses());
    setIsFormOpen(false);
    toast.success(editingExpense ? 'Expense updated' : 'Expense added');
  }, [form, editingExpense]);

  const handleDelete = useCallback(() => {
    if (!deletingExpense) return;
    deleteExpense(deletingExpense.id);
    setExpenses(getExpenses());
    setIsDeleteOpen(false);
    setDeletingExpense(null);
    toast.success('Expense deleted');
  }, [deletingExpense]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/20">
            <Wallet className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Expense Tracker</h2>
            <p className="text-sm text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/20"
          onClick={openAddDialog}
        >
          <Plus className="size-4 mr-1.5" />
          Add Expense
        </Button>
      </motion.div>

      {/* Summary Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-100 to-rose-50 dark:from-rose-950/40 dark:to-rose-900/20 px-4 py-1.5">
          <TrendingDown className="size-4 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-medium text-rose-700 dark:text-rose-300">This Month</span>
          <span className="text-sm font-bold text-rose-800 dark:text-rose-200">
            {formatAmount(stats.totalThisMonth, currencyCode)}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-100 to-violet-50 dark:from-violet-950/40 dark:to-violet-900/20 px-4 py-1.5">
          <Wallet className="size-4 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-medium text-violet-700 dark:text-violet-300">This Year</span>
          <span className="text-sm font-bold text-violet-800 dark:text-violet-200">
            {formatAmount(stats.totalThisYear, currencyCode)}
          </span>
        </div>
      </motion.div>

      {/* Category Breakdown Pills */}
      {Object.keys(stats.byCategory).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="flex items-center gap-2 flex-wrap"
        >
          {CATEGORIES.filter((c) => stats.byCategory[c.name] > 0).map((cat) => {
            const style = CATEGORY_STYLES[cat.color];
            return (
              <span
                key={cat.name}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.pill} ${style.pillText}`}
              >
                <span className={`size-2 rounded-full ${style.dot}`} />
                {cat.name}: {formatAmount(stats.byCategory[cat.name] || 0, currencyCode)}
              </span>
            );
          })}
        </motion.div>
      )}

      {/* Search + Filter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.name} value={cat.name}>
                <span className="inline-flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${CATEGORY_STYLES[cat.color].dot}`} />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/20 p-8 mb-4">
            <TrendingDown className="size-14 text-rose-400/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {expenses.length === 0 ? 'No expenses yet' : 'No matching expenses'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            {expenses.length === 0
              ? 'Start tracking your business expenses to see where your money goes.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'}
          </p>
          {expenses.length === 0 && (
            <Button
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
              onClick={openAddDialog}
            >
              <Plus className="size-4 mr-1.5" />
              Add Your First Expense
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-1"
        >
          <AnimatePresence mode="popLayout">
            {filteredExpenses.map((expense) => {
              const style = getCategoryStyle(expense.category);

              return (
                <motion.div
                  key={expense.id}
                  layout
                  variants={itemVariants}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                  transition={{
                    duration: 0.35,
                    type: 'spring',
                    stiffness: 300,
                    damping: 24,
                  }}
                >
                  <Card
                    className={`border-l-4 ${style.border} shadow-sm hover:shadow-md transition-shadow duration-200`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Description + Category Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">
                              {expense.description}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge} ${style.badgeText}`}
                            >
                              <span className={`size-1.5 rounded-full ${style.dot}`} />
                              {expense.category}
                            </span>
                          </div>

                          {/* Amount */}
                          <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                            {formatAmount(expense.amount, currencyCode)}
                          </p>

                          {/* Date */}
                          <p className="text-xs text-muted-foreground">
                            {expense.date
                              ? new Date(expense.date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'No date'}
                          </p>

                          {/* Notes */}
                          {expense.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {expense.notes}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => openDeleteDialog(expense)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? 'Update expense details below.'
                : 'Fill in expense details to track your spending.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Description <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="What did you spend on?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Amount <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount || ''}
                onChange={(e) =>
                  setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`size-2.5 rounded-full ${CATEGORY_STYLES[cat.color].dot}`}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Additional notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
              onClick={handleSave}
            >
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deletingExpense?.description}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
