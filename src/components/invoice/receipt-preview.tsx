'use client';

import { useCallback } from 'react';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatInvoiceNumber, formatAmount, indianFmt, getCurrencyConfig } from '@/lib/utils';
import { savePDF, printPDF } from '@/lib/capacitor-helpers';
import { format } from 'date-fns';
import type { InvoiceFormData, BusinessProfileData, AppSettingsData } from '@/lib/types';

interface InvoiceWithMeta extends InvoiceFormData {
  status: string;
  createdAt: string;
  updatedAt: string;
  finalizedDate?: string;
  paidDate?: string;
  dueDate: string;
}

interface ReceiptPreviewProps {
  invoice: InvoiceWithMeta;
  profile: BusinessProfileData;
  settings: AppSettingsData;
  onDownloadPDF?: () => void;
}

export function ReceiptPreview({ invoice, profile, settings, onDownloadPDF }: ReceiptPreviewProps) {
  const currencyConfig = getCurrencyConfig(settings.currency);

  const generateReceiptDoc = useCallback(async () => {
    const jsPDFModule = await import('jspdf');
    const { default: jsPDF } = jsPDFModule;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = margin;

    // Receipt header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // PAID Stamp
    doc.setFontSize(36);
    doc.setTextColor(0, 150, 80);
    doc.text('PAID', pageWidth / 2, y + 10, { align: 'center', angle: 25 });
    doc.setTextColor(0, 0, 0);
    y += 20;

    // Business info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.companyName || 'My Business', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (profile.address) { y += 4; doc.text(profile.address, margin, y); }
    if (profile.mobile) { y += 4; doc.text(`Ph: ${profile.mobile}`, margin, y); }
    y += 8;

    // Receipt details
    doc.setFontSize(8);
    doc.text(`Receipt No: RCP-${String(invoice.invoiceNumber).padStart(4, '0')}`, margin, y);
    doc.text(`Date: ${invoice.paidDate ? format(new Date(invoice.paidDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
    doc.text(`Client: ${invoice.clientName}`, margin, y);
    if (invoice.paymentMethod) {
      doc.text(`Payment: ${invoice.paymentMethod}`, pageWidth - margin, y, { align: 'right' });
    }
    y += 8;

    // Items table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Item', margin, y);
    doc.text('Qty', pageWidth - margin - 30, y, { align: 'right' });
    doc.text('Amount', pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    doc.setFont('helvetica', 'normal');
    invoice.items.forEach((item) => {
      if (item.description.trim() && item.amount > 0) {
        doc.text(item.description.substring(0, 30), margin, y);
        doc.text(String(item.qty), pageWidth - margin - 30, y, { align: 'right' });
        doc.text(indianFmt(item.amount), pageWidth - margin, y, { align: 'right' });
        y += 4;
      }
    });

    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total:', margin, y);
    doc.text(formatAmount(invoice.totalAmount, settings.currency), pageWidth - margin, y, { align: 'right' });

    return doc;
  }, [invoice, profile, settings]);

  const handleDownloadReceiptPDF = useCallback(async () => {
    try {
      const doc = await generateReceiptDoc();
      const filename = `Receipt-${formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}.pdf`;
      const result = await savePDF(doc, filename);
      if (result.success) {
        toast.success('Receipt PDF saved!', {
          description: result.path ? 'Saved to device' : 'PDF downloaded successfully',
        });
      }
    } catch (error) {
      console.error('Receipt PDF error:', error);
      toast.error('Failed to generate receipt PDF');
    }
  }, [generateReceiptDoc, invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits]);

  const handlePrintReceipt = useCallback(async () => {
    try {
      const doc = await generateReceiptDoc();
      const filename = `Receipt-${formatInvoiceNumber(invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits)}.pdf`;
      const success = await printPDF(doc, filename);
      if (success) {
        toast.success('Opening receipt for printing...');
      }
    } catch {
      toast.error('Failed to print receipt');
    }
  }, [generateReceiptDoc, invoice.invoiceNumber, settings.invoicePrefix, settings.invoiceDigits]);

  return (
    <div className="space-y-3">
      {/* Receipt Card */}
      <div className="border rounded-lg p-4 relative bg-white dark:bg-card" style={{ fontFamily: 'serif' }}>
        {/* PAID Stamp */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-5xl font-bold text-emerald-500/15 rotate-45 select-none">PAID</span>
        </div>

        {/* Receipt Header */}
        <div className="text-center mb-3 relative">
          <h3 className="text-lg font-bold">RECEIPT</h3>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{profile.companyName || 'My Business'}</p>
          {profile.address && <p className="text-[10px] text-muted-foreground">{profile.address}</p>}
          {profile.mobile && <p className="text-[10px] text-muted-foreground">Ph: {profile.mobile}</p>}
        </div>

        <div className="border-t border-dashed my-2" />

        {/* Receipt Details */}
        <div className="flex justify-between text-xs mb-3">
          <div>
            <p>Receipt No: <span className="font-medium">RCP-{String(invoice.invoiceNumber).padStart(4, '0')}</span></p>
            <p>Date: <span className="font-medium">{invoice.paidDate ? format(new Date(invoice.paidDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</span></p>
          </div>
          <div className="text-right">
            <p>Client: <span className="font-medium">{invoice.clientName}</span></p>
            {invoice.paymentMethod && <p>Payment: <span className="font-medium">{invoice.paymentMethod}</span></p>}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between font-semibold border-b pb-1">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {invoice.items.filter(item => item.description.trim() && item.amount > 0).map((item) => (
            <div key={item.sno} className="flex justify-between">
              <span className="truncate max-w-[200px]">{item.description}</span>
              <span className="tabular-nums">{indianFmt(item.amount)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed my-2" />

        {/* Total */}
        <div className="flex justify-between font-bold text-sm">
          <span>Total</span>
          <span className="text-emerald-700 dark:text-emerald-300">{formatAmount(invoice.totalAmount, settings.currency)}</span>
        </div>
      </div>

      {/* Receipt Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs"
          onClick={onDownloadPDF || handleDownloadReceiptPDF}>
          <Download className="size-3.5 mr-1" /> Download PDF
        </Button>
        <Button variant="outline" className="h-10 text-xs" onClick={handlePrintReceipt}>
          <Printer className="size-3.5 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

export default ReceiptPreview;
