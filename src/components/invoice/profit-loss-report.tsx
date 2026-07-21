'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  format,
  startOfMonth,
  startOfYear,
  isWithinInterval,
  subMonths,
  parseISO,
} from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Wallet,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getInvoices, getExpenses } from '@/lib/local-storage';
import { formatAmount } from '@/lib/utils';
import { useInvoiceFormStore } from '@/store/invoice-store';
import type { InvoiceListItem, ExpenseData } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────
type Period = 'this-month' | 'this-year' | 'all-time';

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ClientRevenue {
  name: string;
  revenue: number;
  invoiceCount: number;
}

interface MonthlyData {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
}

// ─── Category Color Map ──────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#f43f5e',
  Utilities: '#0ea5e9',
  Supplies: '#f59e0b',
  Travel: '#8b5cf6',
  Food: '#f97316',
  Marketing: '#ec4899',
  Software: '#14b8a6',
  Salaries: '#10b981',
  Maintenance: '#64748b',
  Other: '#9ca3af',
  Insurance: '#6366f1',
  Taxes: '#dc2626',
  Miscellaneous: '#78716c',
};

const DEFAULT_CATEGORY_COLOR = '#9ca3af';

// ─── useAnimatedCounter Hook ─────────────────────────────────
function useAnimatedCounter(target: number, duration: number = 0.8) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, target, {
      duration,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [target, duration, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  return display;
}

// ─── AnimatedAmount Component ─────────────────────────────────
function AnimatedAmount({
  amount,
  currencyCode,
  duration,
}: {
  amount: number;
  currencyCode: string;
  duration?: number;
}) {
  const display = useAnimatedCounter(amount, duration);
  return <>{formatAmount(display, currencyCode)}</>;
}

// ─── filterInvoicesByPeriod ───────────────────────────────────
function filterInvoicesByPeriod(
  invoices: InvoiceListItem[],
  period: Period
): InvoiceListItem[] {
  if (period === 'all-time') return invoices;
  const now = new Date();
  const start =
    period === 'this-month' ? startOfMonth(now) : startOfYear(now);

  return invoices.filter((inv) => {
    try {
      const invDate = parseISO(inv.createdAt);
      return isWithinInterval(invDate, { start, end: now });
    } catch {
      return false;
    }
  });
}

// ─── filterExpensesByPeriod ───────────────────────────────────
function filterExpensesByPeriod(
  expenses: ExpenseData[],
  period: Period
): ExpenseData[] {
  if (period === 'all-time') return expenses;
  const now = new Date();
  const start =
    period === 'this-month' ? startOfMonth(now) : startOfYear(now);

  return expenses.filter((exp) => {
    try {
      const expDate = parseISO(exp.date);
      return isWithinInterval(expDate, { start, end: now });
    } catch {
      return false;
    }
  });
}

// ─── SummaryCard Component ───────────────────────────────────
function SummaryCard({
  title,
  amount,
  icon: Icon,
  gradient,
  trend,
  trendValue,
  currencyCode,
  delay,
}: {
  title: string;
  amount: number;
  icon: React.ElementType;
  gradient: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue?: string;
  currencyCode: string;
  delay: number;
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden group">
        {/* Decorative circle */}
        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute -right-3 -top-3 size-16 rounded-full bg-white/5 group-hover:scale-125 transition-transform duration-500" />

        <CardContent className="p-4">
          <div className={`rounded-xl ${gradient} p-3 w-fit mb-3`}>
            <Icon className="size-5 text-white" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">
            <AnimatedAmount amount={amount} currencyCode={currencyCode} />
          </p>
          {trend !== 'neutral' && TrendIcon && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon
                className={`size-3.5 ${
                  trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── ComparisonBar Component ──────────────────────────────────
function ComparisonBar({
  income,
  expenses,
  currencyCode,
}: {
  income: number;
  expenses: number;
  currencyCode: string;
}) {
  const maxVal = Math.max(income, expenses, 1);
  const incomePercent = (income / maxVal) * 100;
  const expensePercent = (expenses / maxVal) * 100;
  const expenseRatio = income > 0 ? ((expenses / income) * 100).toFixed(1) : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Scale className="size-4 text-emerald-500" />
            Income vs Expenses
          </CardTitle>
          <CardDescription>Visual comparison of your income and expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Income bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Income
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {formatAmount(income, currencyCode)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-emerald-100 dark:bg-emerald-950/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${incomePercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              />
            </div>
          </div>

          {/* Expenses bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-rose-700 dark:text-rose-400">
                Expenses
              </span>
              <span className="font-bold text-rose-700 dark:text-rose-400">
                {formatAmount(expenses, currencyCode)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-rose-100 dark:bg-rose-950/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
                initial={{ width: 0 }}
                animate={{ width: `${expensePercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
          </div>

          <Separator />

          {/* Expense Ratio */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Expense Ratio</span>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                Number(expenseRatio) > 80
                  ? 'border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400'
                  : Number(expenseRatio) > 50
                    ? 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400'
                    : 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
              }`}
            >
              {expenseRatio}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── MonthlyTrend Component ──────────────────────────────────
function MonthlyTrend({
  data,
  currencyCode,
}: {
  data: MonthlyData[];
  currencyCode: string;
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-500" />
            Monthly Trend
          </CardTitle>
          <CardDescription>6-month income vs expenses overview</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-rose-500" />
              <span className="text-xs text-muted-foreground">Expenses</span>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-3">
            {data.map((item, index) => {
              const incomeHeight = (item.income / maxVal) * 100;
              const expenseHeight = (item.expenses / maxVal) * 100;

              return (
                <div key={item.monthKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground w-12">
                      {item.month}
                    </span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatAmount(item.income, currencyCode)}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {formatAmount(item.expenses, currencyCode)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    <div className="flex-1 bg-emerald-100 dark:bg-emerald-950/30 rounded-sm overflow-hidden h-full flex items-end">
                      <motion.div
                        className="w-full rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-400"
                        initial={{ height: 0 }}
                        animate={{ height: `${incomeHeight}%` }}
                        transition={{
                          duration: 0.6,
                          ease: 'easeOut',
                          delay: 0.5 + index * 0.08,
                        }}
                      />
                    </div>
                    <div className="flex-1 bg-rose-100 dark:bg-rose-950/30 rounded-sm overflow-hidden h-full flex items-end">
                      <motion.div
                        className="w-full rounded-sm bg-gradient-to-t from-rose-500 to-rose-400"
                        initial={{ height: 0 }}
                        animate={{ height: `${expenseHeight}%` }}
                        transition={{
                          duration: 0.6,
                          ease: 'easeOut',
                          delay: 0.55 + index * 0.08,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── CategoryBreakdownCard Component ─────────────────────────
function CategoryBreakdownCard({
  categories,
  totalExpenses,
  currencyCode,
}: {
  categories: CategoryBreakdown[];
  totalExpenses: number;
  currencyCode: string;
}) {
  if (categories.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wallet className="size-4 text-rose-500" />
            Expense Breakdown
          </CardTitle>
          <CardDescription>Spending by category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((cat, index) => (
            <div key={cat.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-xs">{cat.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {cat.percentage.toFixed(1)}%
                  </span>
                  <span className="text-xs font-semibold">
                    {formatAmount(cat.amount, currencyCode)}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.percentage}%` }}
                  transition={{
                    duration: 0.6,
                    ease: 'easeOut',
                    delay: 0.6 + index * 0.05,
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── TopClientsCard Component ────────────────────────────────
function TopClientsCard({
  clients,
  totalRevenue,
  currencyCode,
}: {
  clients: ClientRevenue[];
  totalRevenue: number;
  currencyCode: string;
}) {
  if (clients.length === 0) return null;

  const rankStyles = [
    'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 shadow-amber-200',
    'bg-gradient-to-r from-slate-300 to-gray-300 text-slate-700 shadow-slate-200',
    'bg-gradient-to-r from-orange-400 to-amber-600 text-orange-900 shadow-orange-200',
  ];

  const maxRevenue = clients[0]?.revenue || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            Top Clients
          </CardTitle>
          <CardDescription>Top 5 by revenue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.slice(0, 5).map((client, index) => {
            const revenuePercent = (client.revenue / maxRevenue) * 100;
            const rankStyle =
              index < 3 ? rankStyles[index] : 'bg-muted text-muted-foreground';

            return (
              <div key={client.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${rankStyle}`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {client.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {client.invoiceCount} inv
                    </span>
                    <span className="text-sm font-bold">
                      {formatAmount(client.revenue, currencyCode)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${revenuePercent}%` }}
                    transition={{
                      duration: 0.6,
                      ease: 'easeOut',
                      delay: 0.65 + index * 0.06,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── PeriodSummaryFooter Component ───────────────────────────
function PeriodSummaryFooter({
  period,
  income,
  expenses,
  netProfit,
  invoiceCount,
  expenseCount,
  currencyCode,
}: {
  period: Period;
  income: number;
  expenses: number;
  netProfit: number;
  invoiceCount: number;
  expenseCount: number;
  currencyCode: string;
}) {
  const periodLabel =
    period === 'this-month'
      ? 'This Month'
      : period === 'this-year'
        ? 'This Year'
        : 'All Time';

  const isProfit = netProfit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
    >
      <Card
        className={`overflow-hidden border-0 ${
          isProfit
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
            : 'bg-gradient-to-r from-rose-600 to-rose-500'
        }`}
      >
        <CardContent className="p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 opacity-80" />
              <span className="text-sm font-medium opacity-90">
                {periodLabel} Summary
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 text-xs">
              {invoiceCount} invoices · {expenseCount} expenses
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                Income
              </p>
              <p className="text-sm font-bold">{formatAmount(income, currencyCode)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                Expenses
              </p>
              <p className="text-sm font-bold">{formatAmount(expenses, currencyCode)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                Net {isProfit ? 'Profit' : 'Loss'}
              </p>
              <p className="text-sm font-bold">
                {isProfit ? '+' : '-'}
                {formatAmount(Math.abs(netProfit), currencyCode)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── EmptyState Component ────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950/30 dark:to-gray-900/20 p-8 mb-4">
        <Scale className="size-14 text-slate-400/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No Data Available</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Create invoices and record expenses to see your profit &amp; loss report here.
      </p>
    </motion.div>
  );
}

// ─── Main ProfitLossReport Component ─────────────────────────
export function ProfitLossReport() {
  const { settings } = useInvoiceFormStore();
  const currencyCode = settings.currency;

  const [period, setPeriod] = useState<Period>('this-month');
  const [invoices, setInvoices] = useState<InvoiceListItem[]>(() => getInvoices());
  const [expenses, setExpenses] = useState<ExpenseData[]>(() => getExpenses());

  // Filter data by period
  const filteredInvoices = useMemo(
    () => filterInvoicesByPeriod(invoices, period),
    [invoices, period]
  );
  const filteredExpenses = useMemo(
    () => filterExpensesByPeriod(expenses, period),
    [expenses, period]
  );

  // Compute income (from paid/finalized invoices)
  const income = useMemo(
    () =>
      filteredInvoices
        .filter((inv) => inv.status === 'paid' || inv.status === 'finalized')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    [filteredInvoices]
  );

  // Compute total expenses
  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    [filteredExpenses]
  );

  // Net profit/loss
  const netProfit = income - totalExpenses;

  // Category breakdown
  const categoryBreakdown: CategoryBreakdown[] = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredExpenses.forEach((exp) => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenses]);

  // Top clients by revenue
  const topClients: ClientRevenue[] = useMemo(() => {
    const clientMap: Record<string, { revenue: number; invoiceCount: number }> = {};
    filteredInvoices
      .filter((inv) => inv.status === 'paid' || inv.status === 'finalized')
      .forEach((inv) => {
        const name = inv.clientName || 'Unknown';
        if (!clientMap[name]) {
          clientMap[name] = { revenue: 0, invoiceCount: 0 };
        }
        clientMap[name].revenue += inv.totalAmount || 0;
        clientMap[name].invoiceCount += 1;
      });

    return Object.entries(clientMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredInvoices]);

  // Monthly trend data (last 6 months)
  const monthlyData: MonthlyData[] = useMemo(() => {
    const months: MonthlyData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59
      );
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM');

      const monthIncome = invoices
        .filter((inv) => {
          try {
            const d = parseISO(inv.createdAt);
            return (
              isWithinInterval(d, { start: monthStart, end: monthEnd }) &&
              (inv.status === 'paid' || inv.status === 'finalized')
            );
          } catch {
            return false;
          }
        })
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      const monthExpenses = expenses
        .filter((exp) => {
          try {
            const d = parseISO(exp.date);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      months.push({
        month: monthLabel,
        monthKey,
        income: monthIncome,
        expenses: monthExpenses,
      });
    }

    return months;
  }, [invoices, expenses]);

  // Trend indicator — compare to previous period (simplified: compare current filtered to a rough prior)
  const incomeTrend: 'up' | 'down' | 'neutral' = useMemo(() => {
    if (period === 'all-time') return 'neutral';
    const currentIncome = income;
    // Very simple heuristic: just mark up if positive
    if (currentIncome > 0) return 'up';
    if (currentIncome < 0) return 'down';
    return 'neutral';
  }, [income, period]);

  const expenseTrend: 'up' | 'down' | 'neutral' = useMemo(() => {
    if (period === 'all-time') return 'neutral';
    if (totalExpenses > 0) return 'down'; // expenses are "bad"
    return 'neutral';
  }, [totalExpenses, period]);

  const profitTrend: 'up' | 'down' | 'neutral' = useMemo(() => {
    return netProfit >= 0 ? 'up' : 'down';
  }, [netProfit]);

  const hasData = invoices.length > 0 || expenses.length > 0;

  const periodLabel =
    period === 'this-month'
      ? 'This Month'
      : period === 'this-year'
        ? 'This Year'
        : 'All Time';

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/20">
            <Scale className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Profit &amp; Loss</h2>
            <p className="text-sm text-muted-foreground">
              Financial overview · {periodLabel}
            </p>
          </div>
        </div>
        <Select
          value={period}
          onValueChange={(val) => setPeriod(val as Period)}
        >
          <SelectTrigger className="w-[160px]">
            <Calendar className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              title="Income"
              amount={income}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
              trend={incomeTrend}
              trendValue={income > 0 ? 'Revenue earned' : 'No revenue'}
              currencyCode={currencyCode}
              delay={0.1}
            />
            <SummaryCard
              title="Expenses"
              amount={totalExpenses}
              icon={TrendingDown}
              gradient="bg-gradient-to-br from-rose-500 to-rose-600"
              trend={expenseTrend}
              trendValue={totalExpenses > 0 ? 'Money spent' : 'No expenses'}
              currencyCode={currencyCode}
              delay={0.15}
            />
            <SummaryCard
              title={netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
              amount={Math.abs(netProfit)}
              icon={netProfit >= 0 ? IndianRupee : TrendingDown}
              gradient={
                netProfit >= 0
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-br from-rose-500 to-orange-500'
              }
              trend={profitTrend}
              trendValue={
                netProfit >= 0
                  ? `${((income > 0 ? netProfit / income : 0) * 100).toFixed(1)}% margin`
                  : 'Loss incurred'
              }
              currencyCode={currencyCode}
              delay={0.2}
            />
          </div>

          {/* Comparison Bar */}
          <ComparisonBar
            income={income}
            expenses={totalExpenses}
            currencyCode={currencyCode}
          />

          {/* Monthly Trend */}
          <MonthlyTrend data={monthlyData} currencyCode={currencyCode} />

          {/* Category Breakdown + Top Clients (2 columns on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryBreakdownCard
              categories={categoryBreakdown}
              totalExpenses={totalExpenses}
              currencyCode={currencyCode}
            />
            <TopClientsCard
              clients={topClients}
              totalRevenue={income}
              currencyCode={currencyCode}
            />
          </div>

          {/* Period Summary Footer */}
          <PeriodSummaryFooter
            period={period}
            income={income}
            expenses={totalExpenses}
            netProfit={netProfit}
            invoiceCount={filteredInvoices.length}
            expenseCount={filteredExpenses.length}
            currencyCode={currencyCode}
          />
        </>
      )}
    </div>
  );
}
