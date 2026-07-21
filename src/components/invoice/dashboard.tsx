'use client';

import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { useAppStore } from '@/store/app-store';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  FileText, IndianRupee, Clock, FilePen, ChevronRight, Plus,
  Sun, CloudSun, Moon, TrendingUp, FilePlus, History, ArrowRight,
  Sparkles, Activity, AlertTriangle, Search, Scale,
} from 'lucide-react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { DashboardStats, InvoiceListItem } from '@/lib/types';
import { formatInvoiceNumber, formatAmount } from '@/lib/utils';
import { getStats, getInvoices } from '@/lib/local-storage';

// ─── Time-of-day helpers ────────────────────────────────────
function TimeIcon({ hour }: { hour: number }) {
  if (hour >= 5 && hour < 12) return <Sun className="size-5 text-amber-500" />;
  if (hour >= 12 && hour < 18) return <CloudSun className="size-5 text-orange-400" />;
  return <Moon className="size-5 text-indigo-400" />;
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

const SUBTITLES = [
  'Time to create some invoices!',
  'Your business is growing!',
  'Keep up the great work!',
  'Every invoice counts!',
  'Stay on top of your finances!',
];

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'paid': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Paid</Badge>;
    case 'finalized': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Finalized</Badge>;
    case 'draft': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Draft</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, gradient, iconBg, border, index, trend }: {
  title: string; value: string; icon: React.ElementType; gradient: string; iconBg: string; border: string; index: number; trend?: { value: number; label: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.15 } }}
      className="group"
    >
      <Card className={`overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 ${border}`}>
        <div className={`${gradient} relative`}
          style={{ backgroundImage: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.15) 0%, transparent 50%)' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{title}</p>
                <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
                {trend && trend.value !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                    trend.value > 0
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30'
                  }`}>
                    {trend.value > 0 ? <TrendingUp className="size-2.5" /> : <TrendingUp className="size-2.5 rotate-180" />}
                    {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
                  </span>
                )}
              </div>
              <div className={`rounded-xl p-3 ${iconBg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-200`}>
                <Icon className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Quick Action Card ───────────────────────────────────────
function QuickActionCard({ title, description, icon: Icon, gradient, iconBg, index, onClick }: {
  title: string; description: string; icon: React.ElementType; gradient: string; iconBg: string; index: number; onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 border-0 relative">
        {/* Decorative dot pattern */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '12px 12px' }}
        />
        <div className={`${gradient} p-4 sm:p-5 relative`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${iconBg} shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-200`}>
              <Icon className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-white">{title}</h3>
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <ArrowRight className="size-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-0.5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Sparkline bars (decorative) ─────────────────────────────
function SparklineBars() {
  const heights = [40, 65, 35, 80, 55, 90, 50];
  return (
    <div className="flex items-end gap-1 h-8">
      {heights.map((h, i) => (
        <motion.div key={i} className="w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500"
          initial={{ height: 0 }} animate={{ height: `${h}%` }}
          transition={{ duration: 0.4, delay: 0.6 + i * 0.06 }} />
      ))}
    </div>
  );
}

// ─── Revenue Chart ───────────────────────────────────────────
function RevenueChart({ currencyCode }: { currencyCode: string }) {
  const chartData = useMemo(() => {
    const invoices = getInvoices();
    const months: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = format(d, 'MMM');
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const revenue = invoices
        .filter(inv => {
          const invDate = new Date(inv.createdAt);
          return invDate >= monthStart && invDate <= monthEnd && (inv.status === 'paid' || inv.status === 'finalized');
        })
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      months.push({ month: monthName, revenue });
    }
    return months;
  }, [currencyCode]);

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
  const now = new Date();
  const currentMonth = format(now, 'MMM');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}
      whileHover={{ transition: { duration: 0.2 } }}
      className="group/chart"
    >
      <Card className="shadow-md border border-emerald-100 dark:border-emerald-900/30 overflow-hidden group-hover/chart:shadow-lg transition-shadow duration-300">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-1.5 bg-emerald-100 dark:bg-emerald-900/40">
                  <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Revenue Trend</p>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Last 6 months</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className={`w-full rounded-t-sm ${d.month === currentMonth ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.revenue / maxRevenue) * 80, 4)}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
                  />
                  <span className={`text-[10px] ${d.month === currentMonth ? 'font-bold text-emerald-600' : 'text-muted-foreground'}`}>{d.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-muted-foreground">Avg: {formatAmount(chartData.reduce((s, d) => s + d.revenue, 0) / 6, currencyCode)}/mo</span>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
// ─── Loading Skeleton ───────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-6 w-52 rounded-full bg-muted" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-40 rounded-xl bg-muted" />
      {/* Activity skeleton */}
      <div className="h-24 rounded-xl bg-muted" />
      {/* Recent invoices skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-36 rounded bg-muted" />
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { setView, currentView } = useAppStore();
  const { profile, settings } = useInvoiceFormStore();
  const currencyCode = settings.currency;
  // Show skeleton before hydration completes
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const stats = useMemo(() => getStats(), [currentView]);
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const businessName = profile.companyName || 'Your Business';
  const hour = currentTime.getHours();

  useEffect(() => {
    const interval = setInterval(() => setSubtitleIndex(prev => (prev + 1) % SUBTITLES.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const todayActivity = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayInvoices = (stats?.recentInvoices ?? []).filter(inv => inv.createdAt.startsWith(todayStr));
    return { count: todayInvoices.length, totalAmount: todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) };
  }, [stats]);

  const invoicesExist = (stats?.recentInvoices ?? []).length > 0;

  // Overdue invoices
  const overdueInvoices = useMemo(() => {
    const allInvoices = getInvoices();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allInvoices.filter(inv => {
      if (inv.status === 'paid' || !inv.dueDate) return false;
      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }, [currentView]);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Revenue trend (month-over-month)
  const revenueTrend = useMemo(() => {
    const invoices = getInvoices();
    const now = new Date();
    const thisMonth = invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (inv.status === 'paid' || inv.status === 'finalized');
    });
    const lastMonth = invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === lm && d.getFullYear() === ly && (inv.status === 'paid' || inv.status === 'finalized');
    });
    const thisTotal = thisMonth.reduce((s, i) => s + i.totalAmount, 0);
    const lastTotal = lastMonth.reduce((s, i) => s + i.totalAmount, 0);
    if (lastTotal === 0) return { value: thisTotal > 0 ? 100 : 0, label: 'vs last month' };
    const change = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
    return { value: change, label: 'vs last month' };
  }, [currentView]);

  if (!mounted) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Rich Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-2">
        <div className="flex items-center gap-2.5">
          <TimeIcon hour={hour} />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-500 dark:from-emerald-300 dark:via-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
            {getGreeting(hour)}, {businessName}!
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">{format(currentTime, 'EEEE, d MMMM yyyy')}</p>
        <AnimatePresence mode="wait">
          <motion.p key={subtitleIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="size-3.5" />{SUBTITLES[subtitleIndex]}
          </motion.p>
        </AnimatePresence>
        {stats && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">This Month:</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{stats.totalInvoices} invoices</span>
            <span className="text-xs text-emerald-400">&bull;</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{formatAmount(stats.totalRevenue, currencyCode)} revenue</span>
          </motion.div>
        )}
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard title="Total Invoices" value={String(stats?.totalInvoices ?? 0)} icon={FileText}
          gradient="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20"
          iconBg="bg-emerald-100 dark:bg-emerald-900/40" border="border border-emerald-100 dark:border-emerald-900/30" index={0} />
        <StatCard title="Total Revenue" value={formatAmount(stats?.totalRevenue ?? 0, currencyCode)} icon={IndianRupee}
          gradient="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
          iconBg="bg-amber-100 dark:bg-amber-900/40" border="border border-amber-100 dark:border-amber-900/30" index={1}
          trend={revenueTrend} />
        <StatCard title="Pending Amount" value={formatAmount(stats?.pendingAmount ?? 0, currencyCode)} icon={Clock}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20"
          iconBg="bg-orange-100 dark:bg-orange-900/40" border="border border-orange-100 dark:border-orange-900/30" index={2} />
        <StatCard title="Drafts" value={String(stats?.recentInvoices?.filter(inv => inv.status === 'draft').length ?? 0)} icon={FilePen}
          gradient="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20"
          iconBg="bg-rose-100 dark:bg-rose-900/40" border="border border-rose-100 dark:border-rose-900/30" index={3} />
      </div>

      {/* Overdue Alert */}
      {overdueInvoices.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <Card className="shadow-md border-2 border-orange-200 dark:border-orange-900/40 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl p-2.5 bg-orange-100 dark:bg-orange-900/40 shrink-0">
                    <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                        {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}
                      </p>
                      <Badge className="bg-orange-200/60 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300 hover:bg-orange-200/60 border-0 text-[10px]">
                        {formatAmount(overdueAmount, currencyCode)}
                      </Badge>
                    </div>
                    <p className="text-xs text-orange-600/70 dark:text-orange-400/60 mt-0.5">Past due date &bull; Requires attention</p>
                    <div className="mt-2 space-y-1">
                      {overdueInvoices.slice(0, 3).map(inv => (
                        <button key={inv.id}
                          onClick={() => { useAppStore.getState().setSelectedInvoice(inv.id); setView('preview'); }}
                          className="flex items-center justify-between w-full rounded-lg bg-white/60 dark:bg-black/20 px-2.5 py-1.5 text-xs hover:bg-white/80 dark:hover:bg-black/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{formatInvoiceNumber(inv.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}</span>
                            <span className="text-muted-foreground truncate">{inv.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold">{formatAmount(inv.totalAmount, currencyCode)}</span>
                            {inv.dueDate && <span className="text-orange-600 dark:text-orange-400">Due: {format(new Date(inv.dueDate), 'dd MMM')}</span>}
                          </div>
                        </button>
                      ))}
                      {overdueInvoices.length > 3 && (
                        <Button variant="link" size="sm" className="text-orange-600 h-auto p-0 text-xs" onClick={() => setView('history')}>
                          +{overdueInvoices.length - 3} more overdue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Revenue Chart */}
      <RevenueChart currencyCode={currencyCode} />

      {/* Activity Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
        <Card className="shadow-md border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5 bg-emerald-100 dark:bg-emerald-900/40">
                    <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Today&apos;s Activity</p>
                      <Badge className="bg-emerald-200/60 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300 hover:bg-emerald-200/60 border-0 text-[10px] px-1.5 py-0">
                        {format(new Date(), 'dd MMM')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        <span className="font-semibold">{todayActivity.count}</span> invoice{todayActivity.count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-emerald-300 dark:text-emerald-700">&bull;</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        <span className="font-semibold">{formatAmount(todayActivity.totalAmount, currencyCode)}</span> invoiced
                      </span>
                    </div>
                  </div>
                </div>
                <SparklineBars />
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Recent Invoices */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
        <Card className="shadow-md border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-1.5 bg-emerald-100 dark:bg-emerald-900/40">
                  <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Recent Invoices</CardTitle>
                  <CardDescription>Your last 5 invoices</CardDescription>
                </div>
              </div>
              {invoicesExist && (
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => setView('history')}>
                  View All <ChevronRight className="size-4 ml-0.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {!invoicesExist ? (
              <div className="text-center py-10 text-muted-foreground">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, type: 'spring' }}
                  className="flex flex-col items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-6">
                    <FileText className="size-12 text-emerald-400/60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium">No invoices yet</p>
                    <p className="text-sm text-muted-foreground/70">Create your first invoice and start getting paid!</p>
                  </div>
                  <Button className="mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
                    onClick={() => setView('new-invoice')}>
                    <Plus className="size-4 mr-1.5" /> Create Your First Invoice
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-2">
                {(stats?.recentInvoices ?? []).map((invoice: InvoiceListItem, i: number) => (
                  <motion.div key={invoice.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.5 + i * 0.06 }}
                    className="flex items-center gap-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/20 p-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => { useAppStore.getState().setSelectedInvoice(invoice.id); setView('preview'); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}</span>
                        <StatusBadge status={invoice.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{invoice.clientName || 'Unnamed Client'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatAmount(invoice.totalAmount, currencyCode)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(invoice.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickActionCard title="New Invoice" description="Create a professional invoice" icon={FilePlus}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" iconBg="bg-emerald-700/50" index={0} onClick={() => setView('new-invoice')} />
        <QuickActionCard title="View History" description="Browse past invoices" icon={History}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600" iconBg="bg-blue-700/50" index={1} onClick={() => setView('history')} />
        <QuickActionCard title="P&L Report" description="Income vs expenses" icon={Scale}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600" iconBg="bg-purple-700/50" index={2} onClick={() => setView('reports')} />
        <QuickActionCard title="Search" description="Find anything fast" icon={Search}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600" iconBg="bg-pink-700/50" index={3} onClick={() => setView('search')} />
      </div>
    </div>
  );
}
