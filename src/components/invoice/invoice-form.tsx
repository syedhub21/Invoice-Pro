'use client';

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, Send, X, FileText, AlertCircle, Check, Calculator,
  ClipboardList, CalendarClock, Receipt, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { useAppStore } from '@/store/app-store';
import { amountToWords } from '@/lib/numberToWords';
import { indianFmt, formatAmount } from '@/lib/utils';
import { saveInvoice, saveDraft, getInvoices } from '@/lib/local-storage';
import type { DocumentType } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Document type config ─────────────────────────────────────
const DOC_TYPE_CONFIG: Record<DocumentType, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string; activeBg: string }> = {
  invoice: {
    label: 'Invoice',
    icon: <FileText className="h-3.5 w-3.5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    activeBg: 'bg-emerald-600 text-white',
  },
  estimate: {
    label: 'Estimate',
    icon: <ClipboardList className="h-3.5 w-3.5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    activeBg: 'bg-blue-600 text-white',
  },
  quotation: {
    label: 'Quotation',
    icon: <Receipt className="h-3.5 w-3.5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    activeBg: 'bg-purple-600 text-white',
  },
};

export default function InvoiceForm() {
  const {
    formData, profile, settings, isDirty, lastAutoSave,
    updateForm, updateItem, addItem, removeItem, resetForm,
    setProfile, setSettings, markClean, setAutoSaveDate,
  } = useInvoiceFormStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const documentType = formData.documentType || 'invoice';
  const docConfig = DOC_TYPE_CONFIG[documentType];

  // Document-type-aware labels
  const docLabel = docConfig.label;
  const numberLabel = `${docLabel} Number`;

  useEffect(() => {
    // Initialize from localStorage
    useInvoiceFormStore.getState().initializeFromStorage();
    setInitialLoadDone(true);
  }, []);

  // ─── Form Progress Calculation ──────────────────────────────
  const formProgress = useMemo(() => {
    let score = 0;
    let total = 0;

    // Business details (25%)
    total += 25;
    if (profile.companyName && profile.companyName !== 'My Business') score += 10;
    if (profile.address) score += 5;
    if (profile.mobile) score += 5;
    if (profile.email) score += 5;

    // Client details (25%)
    total += 25;
    if (formData.clientName.trim()) score += 10;
    if (formData.clientMobile.trim()) score += 5;
    if (formData.clientAddress.trim()) score += 5;
    if (formData.clientGstin.trim()) score += 5;

    // Items (30%)
    total += 30;
    const validItems = formData.items.filter(item => item.description.trim() && item.amount > 0);
    if (validItems.length > 0) score += 15;
    score += Math.min(15, validItems.length * 5);

    // Totals (20%)
    total += 20;
    if (formData.totalAmount > 0) score += 12;
    if (formData.date) score += 4;
    if (formData.dueDate || documentType !== 'invoice') score += 4;

    return Math.min(100, Math.round((score / total) * 100));
  }, [profile, formData, documentType]);

  const progressColor = formProgress <= 30 ? 'bg-red-500' : formProgress <= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const progressTextColor = formProgress <= 30 ? 'text-red-600' : formProgress <= 70 ? 'text-amber-600' : 'text-emerald-600';

  // Auto-save
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doAutoSave = useCallback(() => {
    if (!isDirty) return;
    try {
      saveDraft(formData);
      setAutoSaveDate(new Date()); 
      markClean();
    } catch { /* silent */ }
  }, [isDirty, formData, setAutoSaveDate, markClean]);

  useEffect(() => {
    if (!initialLoadDone || !settings.autoSave) return;
    autoSaveRef.current = setInterval(doAutoSave, (settings.autoSaveInterval || 30) * 1000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [initialLoadDone, settings.autoSave, settings.autoSaveInterval, doAutoSave]);

  // Amount in words
  useEffect(() => {
    const words = amountToWords(formData.totalAmount);
    if (words !== formData.amountInWords) updateForm({ amountInWords: words });
  }, [formData.totalAmount]);

  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    if (!formData.clientName.trim()) errors.push('Client name is required');
    if (!formData.items.filter((item) => item.description.trim() && item.amount > 0).length)
      errors.push('At least one item with description and amount > 0 is required');
    return errors;
  }, [formData]);

  const handleSaveDraft = useCallback(() => {
    setIsSaving(true);
    try {
      const saved = saveInvoice(formData, 'draft');
      toast.success('Draft saved', { description: `${docLabel} saved as draft` });
      markClean();
      const invoices = getInvoices();
      const maxNum = invoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 0), 0);
      updateForm({ id: undefined, invoiceNumber: maxNum + 1 });
    } catch { toast.error('Failed to save draft'); } finally { setIsSaving(false); }
  }, [formData, markClean, updateForm, docLabel]);

  const handleFinalize = useCallback(() => {
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) { toast.error('Validation failed', { description: errors[0] }); return; }
    setIsFinalizing(true);
    try {
      const saved = saveInvoice(formData, 'finalized');
      toast.success(`${docLabel} finalized!`, {
        description: `${docLabel} has been finalized`,
        action: { label: 'View', onClick: () => { useAppStore.getState().setSelectedInvoice(saved.id); useAppStore.getState().setView('preview'); } },
      });
      markClean();
      const invoices = getInvoices();
      const maxNum = invoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 0), 0);
      updateForm({ id: undefined, invoiceNumber: maxNum + 1 });
    } catch { toast.error('Failed to finalize'); } finally { setIsFinalizing(false); }
  }, [formData, validate, markClean, updateForm, docLabel]);

  const handleItemNumChange = useCallback((index: number, field: 'qty' | 'rate' | 'mrp', raw: string) => {
    const val = raw === '' ? 0 : parseFloat(raw);
    if (!isNaN(val)) updateItem(index, field, val);
  }, [updateItem]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {formData.id ? `Edit ${docLabel}` : `New ${docLabel}`}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {lastAutoSave && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs gap-1 cursor-default animate-pulse">
                        <Check className="h-3 w-3 text-emerald-500" />
                        Auto-saved {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Last auto-saved at {lastAutoSave.toLocaleString()}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isDirty && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                  <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                    Unsaved
                  </Badge>
                </motion.div>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Form Completion</span>
              <span className={`text-xs font-bold ${progressTextColor}`}>{formProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progressColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${formProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Document Type Toggle */}
          <div className="flex gap-2 p-1 rounded-lg bg-muted/50 border">
            {(Object.entries(DOC_TYPE_CONFIG) as [DocumentType, typeof DOC_TYPE_CONFIG[DocumentType]][]).map(([type, config]) => (
              <button
                key={type}
                onClick={() => updateForm({ documentType: type })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  documentType === type
                    ? `${config.activeBg} shadow-sm`
                    : `text-muted-foreground hover:${config.bgColor} hover:${config.color}`
                }`}
              >
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{config.label.slice(0, 3)}</span>
              </button>
            ))}
          </div>

          {/* Validation Errors */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    {validationErrors.map((err, i) => <p key={i} className="text-sm text-destructive">{err}</p>)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Accordion Sections */}
          <Accordion type="multiple" defaultValue={['header', 'items', 'totals', 'footer', 'options']} className="space-y-3">
            {/* Section 1: Document Header */}
            <AccordionItem value="header" className="border rounded-lg bg-card shadow-sm data-[state=open]:border-l-4 data-[state=open]:border-l-emerald-500">
              <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold">{docLabel} Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium mb-1.5 block">Company Name</Label>
                    <div className="flex items-center gap-2">
                      <Input value={profile.companyName || 'My Business'} disabled className="bg-muted/50 flex-1" />
                      <Button variant="outline" size="sm" className="shrink-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => useAppStore.getState().setView('settings')}>Edit</Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">{numberLabel}</Label>
                    <Input value={formData.invoiceNumber} disabled className="bg-muted/50" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Date</Label>
                    <Input type="date" value={formData.date} onChange={(e) => updateForm({ date: e.target.value })} autoComplete="off" />
                  </div>
                  {/* Due Date: shown for invoice and estimate, not quotation */}
                  {documentType !== 'quotation' && (
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Due Date</Label>
                      <Input type="date" value={formData.dueDate} onChange={(e) => updateForm({ dueDate: e.target.value })} autoComplete="off" />
                    </div>
                  )}
                  {/* Valid Until: only for quotation */}
                  {documentType === 'quotation' && (
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-purple-500" />
                        Valid Until
                      </Label>
                      <Input type="date" value={formData.validUntil || ''} onChange={(e) => updateForm({ validUntil: e.target.value })} autoComplete="off" />
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Client Name <span className="text-destructive">*</span></Label>
                    <Input value={formData.clientName} onChange={(e) => updateForm({ clientName: e.target.value })} placeholder="Enter client name" autoComplete="off"
                      className={!formData.clientName.trim() && validationErrors.length > 0 ? 'border-destructive' : ''} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Client Mobile</Label>
                    <Input type="tel" value={formData.clientMobile} onChange={(e) => updateForm({ clientMobile: e.target.value })} placeholder="+91 98765 43210" autoComplete="off" />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-sm font-medium">Client Address</Label>
                      <span className="text-[10px] text-muted-foreground">{formData.clientAddress.length}/200</span>
                    </div>
                    <Textarea value={formData.clientAddress} onChange={(e) => { if (e.target.value.length <= 200) updateForm({ clientAddress: e.target.value }); }} placeholder="Full address" rows={2} autoComplete="off" />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-sm font-medium">Client GSTIN <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <span className="text-[10px] text-muted-foreground">{formData.clientGstin.length}/15</span>
                    </div>
                    <Input value={formData.clientGstin} onChange={(e) => { if (e.target.value.length <= 15) updateForm({ clientGstin: e.target.value }); }} placeholder="22AAAAA0000A1Z5" autoComplete="off" className="max-w-xs" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Items */}
            <AccordionItem value="items" className="border rounded-lg bg-card shadow-sm data-[state=open]:border-l-4 data-[state=open]:border-l-amber-500">
              <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500">
                    <Calculator className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold">{docLabel} Items</span>
                  <Badge variant="secondary" className="ml-2">{formData.items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-6 pb-5">
                {/* Mobile cards */}
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {formData.items.map((item, index) => (
                      <motion.div key={item.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }} transition={{ duration: 0.2 }}>
                        <Card className="border shadow-none hover:border-emerald-200 dark:hover:border-emerald-800/40 hover:shadow-sm transition-all duration-200">
                          <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">#{item.sno}</CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(index)} disabled={formData.items.length <= 1}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-3 pt-1 space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                              <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Item description" autoComplete="off" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Pack</Label>
                                <Input value={item.pack} onChange={(e) => updateItem(index, 'pack', e.target.value)} placeholder="10x1" autoComplete="off" />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Qty</Label>
                                <Input type="number" step="0.01" min="0" value={item.qty || ''} onChange={(e) => handleItemNumChange(index, 'qty', e.target.value)} autoComplete="off" />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">MRP</Label>
                                <Input type="number" step="0.01" min="0" value={item.mrp || ''} onChange={(e) => handleItemNumChange(index, 'mrp', e.target.value)} autoComplete="off" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Rate</Label>
                                <Input type="number" step="0.01" min="0" value={item.rate || ''} onChange={(e) => handleItemNumChange(index, 'rate', e.target.value)} autoComplete="off" />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Amount</Label>
                                <div className="h-9 px-3 rounded-md border bg-muted/50 flex items-center text-sm font-medium tabular-nums">
                                  {indianFmt(item.amount)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <Button className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Totals */}
            <AccordionItem value="totals" className="border rounded-lg bg-card shadow-sm data-[state=open]:border-l-4 data-[state=open]:border-l-sky-500">
              <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-sky-500 to-blue-500">
                    <Calculator className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold">Totals</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-5">
                <div className="space-y-4 max-w-md">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Subtotal</Label>
                    <span className="text-sm font-medium tabular-nums">{indianFmt(formData.subtotal)}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.taxEnabled} onCheckedChange={(checked) => updateForm({ taxEnabled: checked })} className="data-[state=checked]:bg-emerald-600" />
                        <Label className="text-sm">Tax</Label>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{indianFmt(formData.taxAmount)}</span>
                    </div>
                    {formData.taxEnabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 ml-8">
                        <Input type="number" step="0.01" min="0" max="100" value={formData.taxRate || ''}
                          onChange={(e) => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); if (!isNaN(val)) updateForm({ taxRate: val }); }}
                          className="h-8 w-20 text-sm" autoComplete="off" />
                        <span className="text-sm text-muted-foreground">% GST</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.discountEnabled} onCheckedChange={(checked) => updateForm({ discountEnabled: checked })} className="data-[state=checked]:bg-emerald-600" />
                        <Label className="text-sm">Discount</Label>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-destructive">− {indianFmt(formData.discountAmount)}</span>
                    </div>
                    {formData.discountEnabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 ml-8">
                        <Select value={formData.discountType} onValueChange={(val: 'flat' | 'percent') => updateForm({ discountType: val })}>
                          <SelectTrigger className="h-8 w-24 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat ₹</SelectItem>
                            <SelectItem value="percent">Percent %</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" step="0.01" min="0" value={formData.discountValue || ''}
                          onChange={(e) => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); if (!isNaN(val)) updateForm({ discountValue: val }); }}
                          className="h-8 w-24 text-sm" autoComplete="off" />
                      </motion.div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 -mx-4 px-4 py-3 rounded-lg">
                    <Label className="text-base font-bold">Grand Total</Label>
                    <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatAmount(formData.totalAmount, settings.currency)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground italic">
                    Amount in Words: {formData.amountInWords}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 4: Footer */}
            <AccordionItem value="footer" className="border rounded-lg bg-card shadow-sm data-[state=open]:border-l-4 data-[state=open]:border-l-violet-500">
              <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-500">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold">Footer & Signatories</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Prepared By</Label>
                    <Input value={formData.preparedBy} onChange={(e) => updateForm({ preparedBy: e.target.value })} placeholder="Name" autoComplete="off" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Checked By</Label>
                    <Input value={formData.checkedBy} onChange={(e) => updateForm({ checkedBy: e.target.value })} placeholder="Name" autoComplete="off" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Received By</Label>
                    <Input value={formData.receivedBy} onChange={(e) => updateForm({ receivedBy: e.target.value })} placeholder="Name" autoComplete="off" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-medium">Notes / Terms & Conditions</Label>
                    <span className={`text-[10px] ${formData.notes.length > 450 ? 'text-amber-500' : 'text-muted-foreground'}`}>{formData.notes.length}/500</span>
                  </div>
                  <Textarea value={formData.notes} onChange={(e) => { if (e.target.value.length <= 500) updateForm({ notes: e.target.value }); }} placeholder="Enter terms or notes..." rows={4} autoComplete="off" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 5: Options */}
            <AccordionItem value="options" className="border rounded-lg bg-card shadow-sm data-[state=open]:border-l-4 data-[state=open]:border-l-rose-500">
              <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-rose-500 to-pink-500">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold">{docLabel} Options</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-5">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Template</Label>
                    <Select value={formData.template} onValueChange={(val: 'classic' | 'modern') => updateForm({ template: val })}>
                      <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Payment details: hidden for estimates */}
                  {documentType !== 'estimate' && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Include UPI QR Code</Label>
                      <Switch checked={formData.includeQr} onCheckedChange={(checked) => updateForm({ includeQr: checked })} className="data-[state=checked]:bg-emerald-600" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Include Digital Signature</Label>
                    <Switch checked={formData.includeSignature} onCheckedChange={(checked) => updateForm({ includeSignature: checked })} className="data-[state=checked]:bg-emerald-600" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Sticky Action Bar */}
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t p-3">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => { if (isDirty) setShowClearDialog(true); else resetForm(); }}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
              <Button variant="outline" className="flex-1 h-11 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={handleSaveDraft} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" /> {isSaving ? 'Saving...' : 'Draft'}
              </Button>
              <Button className="flex-1 h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
                onClick={handleFinalize} disabled={isFinalizing}>
                <Send className="h-4 w-4 mr-1" /> {isFinalizing ? 'Finalizing...' : 'Finalize'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
            <DialogDescription>You have unsaved changes. Are you sure you want to discard them?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Keep Editing</Button>
            <Button variant="destructive" onClick={() => { resetForm(); setShowCancelDialog(false); }}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Form Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle>Clear Form?</DialogTitle>
                <DialogDescription>This will reset all fields and remove unsaved changes. This action cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Keep Editing</Button>
            <Button variant="destructive" onClick={() => { resetForm(); setShowClearDialog(false); toast.success('Form cleared'); }}>Clear Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Save Draft button for unsaved changes */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 md:bottom-4 right-4 z-20"
          >
            <Button
              className="h-11 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1.5" /> {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
