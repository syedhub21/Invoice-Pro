import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceFormData, BusinessProfileData, DocumentType } from './types';
import { formatInvoiceNumber } from './utils';

const indianFmt = (n: number): string =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export async function generateInvoicePDF(
  invoice: InvoiceFormData & { id?: string },
  profile: BusinessProfileData,
  qrDataUrl?: string,
  signatureDataUrl?: string
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const documentType = (invoice.documentType || 'invoice') as DocumentType;
  const isModern = invoice.template === 'modern';

  // Document type titles
  const DOC_TITLES: Record<DocumentType, string> = {
    invoice: 'TAX INVOICE',
    estimate: 'ESTIMATE',
    quotation: 'QUOTATION',
  };
  const docTitle = DOC_TITLES[documentType];

  // Helper: check if we need a new page
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── Logo ─────────────────────────────────────────────────
  if (profile.logoPath) {
    try {
      doc.addImage(profile.logoPath, 'PNG', margin, y, 25, 25);
    } catch {
      // Skip if image fails
    }
    y += 5;
  }

  // ─── Header ───────────────────────────────────────────────
  if (isModern) {
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(profile.companyName || 'My Business', pageWidth / 2, 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y = 48;
  } else {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, margin, y + 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.companyName || 'My Business', margin, y + 14);
    y += 20;
  }

  // ─── Company Details ──────────────────────────────────────
  if (!isModern) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let companyY = y;
    if (profile.address) { doc.text(profile.address, margin, companyY); companyY += 4; }
    if (profile.mobile) { doc.text(`Mobile: ${profile.mobile}`, margin, companyY); companyY += 4; }
    if (profile.email) { doc.text(`Email: ${profile.email}`, margin, companyY); companyY += 4; }
    if (profile.gstin) { doc.text(`GSTIN: ${profile.gstin}`, margin, companyY); companyY += 4; }
    y = companyY + 4;
  }

  // ─── Invoice Info ─────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const invNum = formatInvoiceNumber(invoice.invoiceNumber);
  doc.text(`${documentType === 'estimate' ? 'Estimate' : documentType === 'quotation' ? 'Quotation' : 'Invoice'} No: ${invNum}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`Date: ${invoice.date}`, pageWidth - margin, y + 4, { align: 'right' });
  if (documentType === 'quotation' && invoice.validUntil) {
    doc.text(`Valid Until: ${invoice.validUntil}`, pageWidth - margin, y + 8, { align: 'right' });
  } else if (invoice.dueDate) {
    doc.text(`Due: ${invoice.dueDate}`, pageWidth - margin, y + 8, { align: 'right' });
  }

  // Client info on left
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientName || '-', margin, y + 4);
  if (invoice.clientAddress) doc.text(invoice.clientAddress, margin, y + 8);
  if (invoice.clientMobile) doc.text(`Mobile: ${invoice.clientMobile}`, margin, y + 12);
  if (invoice.clientGstin) doc.text(`GSTIN: ${invoice.clientGstin}`, margin, y + 16);
  y += 22;

  // ─── Items Table ──────────────────────────────────────────
  // Check which columns have data
  const hasPack = invoice.items.some(i => i.pack && i.pack.trim() !== '');
  const hasMrp = invoice.items.some(i => i.mrp > 0);

  const tableHeaders = ['#', 'Description'];
  if (hasPack) tableHeaders.push('Pack');
  tableHeaders.push('Qty');
  if (hasMrp) tableHeaders.push('MRP');
  tableHeaders.push('Rate', 'Amount');

  const tableData = invoice.items.map((item) => {
    const row: string[] = [String(item.sno), item.description];
    if (hasPack) row.push(item.pack || '');
    row.push(String(item.qty));
    if (hasMrp) row.push(indianFmt(item.mrp));
    row.push(indianFmt(item.rate), indianFmt(item.amount));
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [tableHeaders],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: isModern ? [5, 150, 105] : [50, 50, 50],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto' },
      ...(hasPack ? { 2: { cellWidth: 18 } } : {}),
      ...(hasPack
        ? { 3: { cellWidth: 15, halign: 'right' } }
        : { 2: { cellWidth: 15, halign: 'right' } }),
      ...(hasMrp
        ? hasPack
          ? { 4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 28, halign: 'right' } }
          : { 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 28, halign: 'right' } }
        : hasPack
          ? { 4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 28, halign: 'right' } }
          : { 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 28, halign: 'right' } }
      ),
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ─── Totals ───────────────────────────────────────────────
  checkPage(40);
  const totalsX = pageWidth - margin - 60;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y);
  doc.text(indianFmt(invoice.subtotal), pageWidth - margin, y, { align: 'right' });
  y += 5;

  if (invoice.taxEnabled && invoice.taxAmount > 0) {
    // Show CGST/SGST split for Indian invoices
    const isINR = !invoice.currency || invoice.currency === 'INR';
    if (isINR && invoice.taxRate >= 2) {
      doc.text(`CGST (${invoice.taxRate / 2}%):`, totalsX, y);
      doc.text(indianFmt(invoice.taxAmount / 2), pageWidth - margin, y, { align: 'right' });
      y += 5;
      doc.text(`SGST (${invoice.taxRate / 2}%):`, totalsX, y);
      doc.text(indianFmt(invoice.taxAmount / 2), pageWidth - margin, y, { align: 'right' });
      y += 5;
    } else {
      doc.text(`Tax (${invoice.taxRate}%):`, totalsX, y);
      doc.text(indianFmt(invoice.taxAmount), pageWidth - margin, y, { align: 'right' });
      y += 5;
    }
  }

  if (invoice.discountEnabled && invoice.discountAmount > 0) {
    doc.text('Discount:', totalsX, y);
    doc.text(`- ${indianFmt(invoice.discountAmount)}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, y);
  const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : invoice.currency === 'GBP' ? '£' : '₹';
  doc.text(`${currencySymbol} ${indianFmt(invoice.totalAmount)}`, pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Amount in Words: ${invoice.amountInWords}`, margin, y);
  y += 8;

  // ─── Bank Details (hidden for quotations) ─────────────────
  if (documentType !== 'quotation' && (profile.bankName || profile.upiId)) {
    checkPage(20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    y += 4;
    if (profile.bankName) doc.text(`Bank: ${profile.bankName} | A/C: ${profile.bankAccount} | IFSC: ${profile.bankIfsc}`, margin, y);
    if (profile.upiId) {
      y += 4;
      doc.text(`UPI: ${profile.upiId}`, margin, y);
    }
    y += 6;
  }

  // ─── QR Code (hidden for estimates) ───────────────────────
  if (documentType !== 'estimate' && invoice.includeQr && qrDataUrl && profile.upiId) {
    checkPage(35);
    const qrSize = 25;
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - qrSize, y, qrSize, qrSize);
    doc.setFontSize(7);
    doc.text('Scan to Pay', pageWidth - margin - qrSize / 2, y + qrSize + 4, { align: 'center' });
  }

  // ─── Signature ────────────────────────────────────────────
  if (invoice.includeSignature && signatureDataUrl) {
    checkPage(25);
    const sigWidth = 40;
    const sigHeight = 15;
    doc.addImage(signatureDataUrl, 'PNG', pageWidth - margin - sigWidth, y, sigWidth, sigHeight);
    doc.setFontSize(8);
    doc.text('Authorized Signatory', pageWidth - margin - sigWidth / 2, y + sigHeight + 4, { align: 'center' });
    y += sigHeight + 8;
  } else {
    y += 5;
  }

  // ─── Footer signatories (each on its own line) ──────────
  if (invoice.preparedBy || invoice.checkedBy || invoice.receivedBy) {
    checkPage(20);
    y += 4;

    // Draw a thin line above signatories
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(8);

    if (invoice.preparedBy) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Prepared By:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.preparedBy, margin + 25, y);
      y += 5;
    }

    if (invoice.checkedBy) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Checked By:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.checkedBy, margin + 25, y);
      y += 5;
    }

    if (invoice.receivedBy) {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Received By:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.receivedBy, margin + 25, y);
      y += 5;
    }
  }

  // ─── Terms & Conditions (AFTER signatories) ──────────────
  const termsContent = invoice.notes || profile.termsConditions;
  if (termsContent) {
    checkPage(20);
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(termsContent, contentWidth);

    // Write lines with page break handling
    for (let i = 0; i < lines.length; i++) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines[i], margin, y);
      y += 4;
    }
  }

  return doc;
}
