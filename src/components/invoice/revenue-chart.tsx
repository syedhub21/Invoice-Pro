'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { getInvoices } from '@/lib/local-storage';
import { formatAmount, indianFmt } from '@/lib/utils';
import { useInvoiceFormStore } from '@/store/invoice-store';

// ─── Types ────────────────────────────────────────────────────
interface MonthlyRevenue {
  month: Date;
  label: string;
  shortLabel: string;
  revenue: number;
  isCurrentMonth: boolean;
}

// ─── Compute last 6 months revenue ───────────────────────────
function computeMonthlyRevenue(): MonthlyRevenue[] {
  const invoices = getInvoices();
  const finalizedOrPaid = invoices.filter(
    (i) => i.status === 'finalized' || i.status === 'paid'
  );

  const now = new Date();
  const months: MonthlyRevenue[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const isCurrentMonth = i === 0;

    const revenue = finalizedOrPaid
      .filter((inv) => {
        const invDate = new Date(inv.createdAt);
        return isWithinInterval(invDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    months.push({
      month: monthDate,
      label: format(monthDate, 'MMMM yyyy'),
      shortLabel: format(monthDate, 'MMM'),
      revenue,
      isCurrentMonth,
    });
  }

  return months;
}

// ─── Single Bar ───────────────────────────────────────────────
function RevenueBar({
  data,
  maxRevenue,
  index,
  currencyCode,
}: {
  data: MonthlyRevenue;
  maxRevenue: number;
  index: number;
  currencyCode?: string;
}) {
  const heightPercent =
    maxRevenue > 0 ? Math.max((data.revenue / maxRevenue) * 100, 0) : 0;
  const hasRevenue = data.revenue > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      {/* Amount label above bar */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-center min-h-[1.25rem]">
              {hasRevenue ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.08 }}
                  className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300 block leading-tight truncate max-w-[4rem] sm:max-w-[5rem]"
                >
                  {indianFmt(data.revenue)}
                </motion.span>
              ) : (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.08 }}
                  className="text-[10px] sm:text-xs text-muted-foreground/50 block leading-tight"
                >
                  &mdash;
                </motion.span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>
              {data.label}: {formatAmount(data.revenue, currencyCode)}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Bar */}
      <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
        <motion.div
          className={`w-full max-w-[2.5rem] sm:max-w-[3rem] rounded-t-md relative ${
            data.isCurrentMonth
              ? 'bg-gradient-to-t from-emerald-500 to-emerald-300 dark:from-emerald-600 dark:to-emerald-400 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40'
              : 'bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-700 dark:to-emerald-500'
          }`}
          initial={{ height: 0 }}
          animate={{ height: hasRevenue ? `${heightPercent}%` : '4px' }}
          transition={{
            duration: 0.6,
            delay: 0.15 + index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            minHeight: hasRevenue ? '8px' : '4px',
          }}
        >
          {/* Current month pulse indicator */}
          {data.isCurrentMonth && hasRevenue && (
            <motion.div
              className="absolute inset-0 rounded-t-md bg-emerald-300/40 dark:bg-emerald-400/30"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
      </div>

      {/* Month label */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 + index * 0.08 }}
        className={`text-[10px] sm:text-xs font-medium leading-tight ${
          data.isCurrentMonth
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-muted-foreground'
        }`}
      >
        {data.shortLabel}
      </motion.span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      className="flex flex-col items-center gap-3 py-8"
    >
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4">
        <BarChart3 className="size-10 text-emerald-300 dark:text-emerald-700" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          No revenue data yet
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-[14rem]">
          Finalize or mark invoices as paid to see your revenue chart here
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function RevenueChart() {
  const { settings } = useInvoiceFormStore();
  const monthlyData = useMemo(() => computeMonthlyRevenue(), []);
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 0);
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const hasAnyRevenue = monthlyData.some((m) => m.revenue > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="shadow-md border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl p-2 bg-emerald-100 dark:bg-emerald-900/40">
                  <BarChart3 className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base text-emerald-800 dark:text-emerald-200">
                    Revenue Overview
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-600/70 dark:text-emerald-400/60">
                    Last 6 months
                  </CardDescription>
                </div>
              </div>
              {hasAnyRevenue && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="text-right"
                >
                  <p className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/60 uppercase tracking-wider">
                    Total
                  </p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatAmount(totalRevenue, settings.currency)}
                  </p>
                </motion.div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {hasAnyRevenue ? (
              <div className="flex items-end gap-2 sm:gap-3">
                {monthlyData.map((data, index) => (
                  <div key={data.label} className="flex-1 min-w-0">
                    <RevenueBar
                      data={data}
                      maxRevenue={maxRevenue}
                      index={index}
                      currencyCode={settings.currency}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}

            {/* Trend footer */}
            {hasAnyRevenue && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-3.5" />
                  <span>
                    Avg:{' '}
                    <span className="font-semibold">
                      {formatAmount(totalRevenue / 6, settings.currency)}
                    </span>
                    /mo
                  </span>
                </div>
                <span className="text-[10px] text-emerald-500/60 dark:text-emerald-500/40">
                  Based on finalized &amp; paid invoices
                </span>
              </motion.div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}
