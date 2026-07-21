'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Printer, Share2, FileText, Copy, Mail, MessageCircle, CheckCircle, Edit, ArrowRightLeft, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { formatInvoiceNumber, formatAmount, indianFmt, getCurrencyConfig } from '@/lib/utils';
import { savePDF, sharePDF, printPDF, emailPDF, whatsappPDF } from '@/lib/capacitor-helpers';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { getInvoiceById, updateInvoiceStatus, saveInvoice } from '@/lib/local-storage';
import type { InvoiceFormData, DocumentType } from '@/lib/types';
import { ReceiptPreview } from '@/components/invoice/receipt-preview';

interface InvoiceWithMeta extends InvoiceFormData {
  status: string;
  createdAt: string;
  updatedAt: string;
  finalizedDate?: string;
  paidDate?: string;
  dueDate: string;
}

// Document type display config
const DOC_TYPE_DISPLAY: Record<DocumentType, { title: string; numberLabel: string }> = {
  invoice: { title: 'TAX INVOICE', numberLabel: 'Inv' },
  estimate: { title: 'ESTIMATE', numberLabel: 'Est' },
  quotation: { title: 'QUOTATION', numberLabel: 'Quo' },
};

export default function InvoicePreview() {
  const { selectedInvoice, setView } = useAppStore();
  const { profile, settings } = useInvoiceFormStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>();
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const currencyConfig = getCurrencyConfig(settings.currency);

  // Load invoice from localStorage via useMemo
  const invoice = useMemo<InvoiceWithMeta | null>(() => {
    if (!selectedInvoice) return null;
    const data = getInvoiceById(selectedInvoice);
    return data ? (data as unknown as InvoiceWithMeta) : null;
  }, [selectedInvoice]);

  const documentType = (invoice?.documentType || 'invoice') as DocumentType;
  const docDisplay = DOC_TYPE_DISPLAY[documentType];
  const isEstimateOrQuotation = documentType === 'estimate' || documentType === 'quotation';

  // Get filename helper
  const getFilename = () => {
    if (!invoice) return 'invoice.pdf';
    return `${formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}.pdf`;
  };

  // Generate QR code when invoice changes
  useEffect(() => {
    if (invoice?.includeQr && profile.upiId) {
      QRCode.toDataURL(`upi://pay?pa=${profile.upiId}&pn=${encodeURIComponent(profile.companyName)}&am=${invoice.totalAmount}&cu=INR`, 
        { width: 200, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(undefined));
    }
  }, [invoice?.includeQr, invoice?.totalAmount, profile.upiId, profile.companyName]);

  // Generate PDF helper (reused across all handlers)
  const generatePDF = async () => {
    if (!invoice) return null;
    return generateInvoicePDF(invoice, profile, qrDataUrl, profile.signaturePath || undefined);
  };

  // ─── PDF Download ─────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!invoice || isProcessing) return;
    setIsProcessing(true);
    try {
      const doc = await generatePDF();
      if (!doc) return;
      const filename = getFilename();
      const result = await savePDF(doc, filename);
      if (result.success) {
        toast.success('PDF saved to Downloads!', {
          description: result.path 
            ? `File saved in ${result.path} — check your Downloads folder.`
            : `PDF saved successfully. Check your Downloads folder.`,
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Print ────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!invoice || isProcessing) return;
    setIsProcessing(true);
    try {
      const doc = await generatePDF();
      if (!doc) return;
      const filename = getFilename();
      const success = await printPDF(doc, filename);
      if (success) {
        toast.success('Opening PDF for printing...', {
          description: 'Select "Print" from the share/open options',
        });
      } else {
        toast.error('Print failed');
      }
    } catch {
      toast.error('Failed to print');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Share ────────────────────────────────────────────────
  const handleShare = async () => {
    if (!invoice || isProcessing) return;
    setIsProcessing(true);
    try {
      const doc = await generatePDF();
      if (!doc) return;
      const filename = getFilename();
      const title = `${docDisplay.title} ${formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}`;
      const success = await sharePDF(doc, filename, title);
      if (!success) {
        toast.error('Share failed');
      }
    } catch {
      toast.error('Share failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicate = () => {
    if (!invoice) return;
    toast.success(`${docDisplay.title} duplicated! Edit in form.`);
    setView('new-invoice');
  };

  // ─── Email (with PDF attachment) ─────────────────────────
  const handleEmail = async () => {
    if (!invoice || isProcessing) return;
    setIsProcessing(true);
    try {
      const doc = await generatePDF();
      if (!doc) return;
      const filename = getFilename();
      const invNum = formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits);
      const subject = `${docDisplay.title} ${invNum}`;
      const body = `Dear ${invoice.clientName},\n\nPlease find attached ${docDisplay.title.toLowerCase()} ${invNum} for ${formatAmount(invoice.totalAmount, settings.currency)}.\n\nDue Date: ${invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy') : 'N/A'}\n\nThank you for your business!`;
      
      const success = await emailPDF(doc, filename, subject, body);
      if (success) {
        toast.success('Share PDF via email', {
          description: 'Select your email app from the share sheet',
        });
      }
    } catch {
      toast.error('Email failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── WhatsApp (with PDF attachment) ──────────────────────
  const handleWhatsApp = async () => {
    if (!invoice || isProcessing) return;
    setIsProcessing(true);
    try {
      const doc = await generatePDF();
      if (!doc) return;
      const filename = getFilename();
      const invNum = formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits);
      const message = `${docDisplay.title} ${invNum}\nClient: ${invoice.clientName}\nAmount: ${formatAmount(invoice.totalAmount, settings.currency)}\nDue: ${invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy') : 'N/A'}`;
      
      const success = await whatsappPDF(doc, filename, message);
      if (success) {
        toast.success('Share PDF via WhatsApp', {
          description: 'Select WhatsApp from the share sheet',
        });
      }
    } catch {
      toast.error('WhatsApp share failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = () => {
    if (!invoice) return;
    updateInvoiceStatus(invoice.id!, 'finalized');
    setStatusOverride('finalized');
    toast.success(`${docDisplay.title} finalized!`);
  };

  const handleMarkPaid = () => {
    if (!invoice) return;
    updateInvoiceStatus(invoice.id!, 'paid');
    setStatusOverride('paid');
    toast.success(`${docDisplay.title} marked as paid!`);
  };

  const handleConvertToInvoice = () => {
    if (!invoice) return;
    const updated = { ...invoice, documentType: 'invoice' as DocumentType };
    saveInvoice(updated, invoice.status);
    toast.success('Converted to Invoice!', {
      description: 'This document is now an invoice',
    });
    setShowConvertDialog(false);
    window.location.reload();
  };

  // Effective status (may be overridden by user action)
  const effectiveStatus = statusOverride || invoice?.status || '';

  // Check overdue
  const isOverdue = useMemo(() => {
    if (!invoice || effectiveStatus === 'paid' || !invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date();
  }, [invoice, effectiveStatus]);

  // Status timeline data
  const timelineSteps = useMemo(() => {
    if (!invoice) return [];
    return [
      { label: 'Created', date: invoice.createdAt, done: true },
      { label: 'Finalized', date: invoice.finalizedDate || (effectiveStatus === 'finalized' || effectiveStatus === 'paid' ? new Date().toISOString() : null), done: effectiveStatus === 'finalized' || effectiveStatus === 'paid' },
      { label: 'Paid', date: invoice.paidDate || (effectiveStatus === 'paid' ? new Date().toISOString() : null), done: effectiveStatus === 'paid' },
    ];
  }, [invoice, effectiveStatus]);

  if (!invoice) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="size-12 mx-auto mb-3 opacity-30" />
        <p>No document selected</p>
        <Button variant="link" className="text-emerald-600 mt-2" onClick={() => setView('history')}>Go to History</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('history')}><ArrowLeft className="size-5" /></Button>
        <h1 className="text-lg font-bold flex-1">{formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}</h1>
        {isEstimateOrQuotation && (
          <Badge className={`border-0 ${documentType === 'estimate' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {docDisplay.title}
          </Badge>
        )}
        <Badge className={`border-0 ${effectiveStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : effectiveStatus === 'finalized' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
          {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
        </Badge>
        {isOverdue && <Badge className="bg-orange-100 text-orange-700 border-0">Overdue</Badge>}
      </div>

      {/* Status Action Bar */}
      <div className="flex gap-2 flex-wrap">
        {effectiveStatus === 'draft' && (
          <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white" onClick={handleFinalize}>
            <CheckCircle className="size-4 mr-1" /> Finalize
          </Button>
        )}
        {effectiveStatus === 'finalized' && (
          <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white" onClick={handleMarkPaid}>
            <CheckCircle className="size-4 mr-1" /> Mark as Paid
          </Button>
        )}
        {isEstimateOrQuotation && (
          <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setShowConvertDialog(true)}>
            <ArrowRightLeft className="size-3.5 mr-1" /> Convert to Invoice
          </Button>
        )}
        {effectiveStatus === 'paid' && (
          <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => setShowReceiptDialog(true)}>
            <Receipt className="size-3.5 mr-1" /> Generate Receipt
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setView('new-invoice')}>
          <Edit className="size-3.5 mr-1" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={handleDuplicate}>
          <Copy className="size-3.5 mr-1" /> Duplicate
        </Button>
      </div>

      {/* Status Timeline */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{docDisplay.title} Timeline</p>
          <div className="flex items-center gap-0">
            {timelineSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.15 + idx * 0.12 }}
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.done ? 'bg-emerald-500 text-white' : 'border-2 border-muted-foreground/30 text-muted-foreground'
                    }`}>
                    {step.done ? '✓' : idx + 1}
                  </motion.div>
                  <span className="text-[10px] mt-1 font-medium">{step.label}</span>
                  {step.date && <span className="text-[9px] text-muted-foreground">{format(new Date(step.date), 'dd MMM yyyy')}</span>}
                  {!step.date && <span className="text-[9px] text-muted-foreground">Pending…</span>}
                </div>
                {idx < timelineSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${step.done && timelineSteps[idx + 1]?.done ? 'bg-emerald-400' : 'bg-muted-foreground/20'}`} />
                )}
              </div>
            ))}
          </div>
          {invoice.paidDate && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              Paid on {format(new Date(invoice.paidDate), 'dd MMM yyyy')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="border rounded-lg p-4 sm:p-6 relative" style={{ fontFamily: 'serif' }}>
              {/* DRAFT Watermark */}
              {effectiveStatus === 'draft' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-6xl font-bold text-muted-foreground/10 rotate-45 select-none">DRAFT</span>
                </div>
              )}
              
              {/* Header */}
              <div className="text-center mb-4">
                {profile.logoPath && <img src={profile.logoPath} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2" />}
                <h2 className="text-xl font-bold">{profile.companyName || 'My Business'}</h2>
                {profile.address && <p className="text-xs text-muted-foreground">{profile.address}</p>}
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  {profile.mobile && <span>Ph: {profile.mobile}</span>}
                  {profile.gstin && <span>GSTIN: {profile.gstin}</span>}
                </div>
              </div>
              <div className="border-t border-b py-3 my-3">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="font-semibold">{docDisplay.title}</p>
                    <p>Bill To: {invoice.clientName || '-'}</p>
                    {invoice.clientAddress && <p className="text-xs">{invoice.clientAddress}</p>}
                    {invoice.clientGstin && <p className="text-xs">GSTIN: {invoice.clientGstin}</p>}
                  </div>
                  <div className="text-right text-xs">
                    <p>{docDisplay.numberLabel}: {formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}</p>
                    <p>Date: {format(new Date(invoice.date), 'dd/MM/yyyy')}</p>
                    {documentType === 'quotation' && invoice.validUntil && (
                      <p>Valid Until: {format(new Date(invoice.validUntil), 'dd/MM/yyyy')}</p>
                    )}
                    {documentType !== 'quotation' && invoice.dueDate && (
                      <p>Due: {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">#</th>
                    <th className="text-left py-1">Description</th>
                    {invoice.items.some(i => i.pack) && <th className="text-right py-1">Pack</th>}
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Rate</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.sno} className="border-b border-dashed">
                      <td className="py-1">{item.sno}</td>
                      <td className="py-1">{item.description}</td>
                      {invoice.items.some(i => i.pack) && <td className="text-right py-1">{item.pack}</td>}
                      <td className="text-right py-1">{item.qty}</td>
                      <td className="text-right py-1">{indianFmt(item.rate)}</td>
                      <td className="text-right py-1">{indianFmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><span>{indianFmt(invoice.subtotal)}</span></div>
                {invoice.taxEnabled && invoice.taxAmount > 0 && (
                  <>
                    <div className="flex justify-between"><span>CGST ({invoice.taxRate / 2}%)</span><span>{indianFmt(invoice.taxAmount / 2)}</span></div>
                    <div className="flex justify-between"><span>SGST ({invoice.taxRate / 2}%)</span><span>{indianFmt(invoice.taxAmount / 2)}</span></div>
                  </>
                )}
                {invoice.discountEnabled && invoice.discountAmount > 0 && (
                  <div className="flex justify-between"><span>Discount ({invoice.discountType === 'percent' ? `${invoice.discountValue}%` : currencyConfig.symbol})</span><span>- {indianFmt(invoice.discountAmount)}</span></div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total</span>
                  <span>{formatAmount(invoice.totalAmount, settings.currency)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic mt-1">Amount in Words: {invoice.amountInWords}</p>
              </div>

              {/* Bank Details - hidden for quotations */}
              {documentType !== 'quotation' && (profile.bankName || profile.upiId) && (
                <div className="mt-3 text-xs border-t pt-2">
                  <p className="font-semibold">Bank Details</p>
                  {profile.bankName && <p>Bank: {profile.bankName}</p>}
                  {profile.bankAccount && <p>A/C: {profile.bankAccount}</p>}
                  {profile.bankIfsc && <p>IFSC: {profile.bankIfsc}</p>}
                  {profile.upiId && <p>UPI: {profile.upiId}</p>}
                </div>
              )}

              {/* QR - hidden for estimates */}
              {documentType !== 'estimate' && invoice.includeQr && qrDataUrl && (
                <div className="mt-3 flex justify-end">
                  <img src={qrDataUrl} alt="UPI QR Code" className="w-20 h-20" />
                </div>
              )}

              {/* Signature */}
              {invoice.includeSignature && profile.signaturePath && (
                <div className="mt-3 flex justify-end">
                  <img src={profile.signaturePath} alt="Signature" className="h-12 object-contain" />
                </div>
              )}

              {/* Signatories (each on its own line) */}
              {(invoice.preparedBy || invoice.checkedBy || invoice.receivedBy) && (
                <div className="mt-3 text-xs border-t pt-2 space-y-1">
                  {invoice.preparedBy && <div><span className="font-semibold">Prepared By:</span> {invoice.preparedBy}</div>}
                  {invoice.checkedBy && <div><span className="font-semibold">Checked By:</span> {invoice.checkedBy}</div>}
                  {invoice.receivedBy && <div><span className="font-semibold">Received By:</span> {invoice.receivedBy}</div>}
                </div>
              )}

              {/* Terms & Conditions (after signatories) */}
              {(invoice.notes || profile.termsConditions) && (
                <div className="mt-3 text-xs border-t pt-2">
                  <p className="font-semibold">Terms & Conditions</p>
                  <p className="text-muted-foreground">{invoice.notes || profile.termsConditions}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-2">
        <Button className="col-span-2 h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
          onClick={handleDownloadPDF} disabled={isProcessing}>
          <Download className="size-4 mr-1" /> {isProcessing ? 'Saving...' : 'PDF'}
        </Button>
        <Button variant="outline" className="h-11" onClick={handlePrint} disabled={isProcessing}>
          <Printer className="size-4" />
        </Button>
        <Button variant="outline" className="h-11" onClick={handleShare} disabled={isProcessing}>
          <Share2 className="size-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-10 text-xs" onClick={handleEmail} disabled={isProcessing}>
          <Mail className="size-3.5 mr-1 text-sky-500" /> Email PDF
        </Button>
        <Button variant="outline" className="h-10 text-xs" onClick={handleWhatsApp} disabled={isProcessing}>
          <MessageCircle className="size-3.5 mr-1 text-green-500" /> WhatsApp PDF
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        Total: {formatAmount(invoice.totalAmount, settings.currency)} &bull; {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
      </p>

      {/* Convert to Invoice Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Invoice?</DialogTitle>
            <DialogDescription>
              This will convert this {docDisplay.title.toLowerCase()} into a formal invoice. The document type will be changed to &quot;Invoice&quot; and payment details will be shown.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white" onClick={handleConvertToInvoice}>
              <ArrowRightLeft className="size-4 mr-1" /> Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Receipt</DialogTitle>
            <DialogDescription>Create a receipt for this paid invoice.</DialogDescription>
          </DialogHeader>
          <ReceiptPreview
            invoice={invoice}
            profile={profile}
            settings={settings}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
