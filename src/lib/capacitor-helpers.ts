// ─── Capacitor-Native Helpers ──────────────────────────
// Provides native file save, share, and print capabilities
// when running inside the Capacitor Android app.
// Falls back to browser APIs when running in a regular browser.

import type { jsPDF } from 'jspdf';

// ─── Capacitor Detection ─────────────────────────────────
// Use window.Capacitor directly — no dynamic imports needed.
// Dynamic imports of @capacitor/core can fail in static-export
// Capacitor builds, causing the entire native call to hang.

function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!(cap && cap.isNativePlatform && cap.isNativePlatform());
}

// Get the custom InvoicePro plugin directly from Capacitor's plugin registry
function getNativePlugin(): any | null {
  const cap = (window as any).Capacitor;
  if (!cap || !cap.Plugins) return null;
  return cap.Plugins.InvoicePro || null;
}

// ─── Timeout wrapper ──────────────────────────────────────
// Ensures native calls don't hang forever.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── PDF Utilities ────────────────────────────────────────

// Get PDF as base64 string (without the data URI prefix)
function getPDFBase64(doc: jsPDF): string {
  const dataUri = doc.output('datauristring');
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid PDF data URI format');
  }
  const base64 = dataUri.substring(commaIndex + 1);
  if (!base64 || base64.length < 10) {
    throw new Error('PDF base64 data is empty or too small');
  }
  return base64;
}

// ─── Native Plugin Call Helper ────────────────────────────
// Calls a method on the native plugin with timeout and error handling.
async function callNative(method: string, args: Record<string, any>, timeoutMs = 10000): Promise<any> {
  const plugin = getNativePlugin();
  if (!plugin) {
    throw new Error('InvoicePro native plugin not found');
  }

  if (typeof plugin[method] !== 'function') {
    throw new Error(`InvoicePro plugin method "${method}" not found`);
  }

  console.log(`[InvoicePro] Calling native: ${method}`);
  const result = await withTimeout(
    plugin[method](args),
    timeoutMs,
    method
  );
  console.log(`[InvoicePro] Native ${method} completed:`, result);
  return result;
}

// ─── Fallback: Save using @capacitor/filesystem ───────────
// Used when the custom native plugin is unavailable or fails.
async function saveWithFilesystem(doc: jsPDF, filename: string): Promise<{ success: boolean; path?: string }> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const pdfBase64 = getPDFBase64(doc);

    // Save to Documents directory (visible to user via file manager)
    const result = await Filesystem.writeFile({
      path: filename,
      data: pdfBase64,
      directory: Directory.Documents,
      recursive: true,
    });

    // Also try ExternalStorage/Download for older Android versions
    try {
      await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: pdfBase64,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
    } catch {
      // Scoped storage on Android 11+ may block this — that's OK
    }

    return { success: true, path: 'Documents/' + filename };
  } catch (err) {
    console.error('[InvoicePro] Filesystem save failed:', err);
    return { success: false };
  }
}

/**
 * Save a PDF to the device's Downloads folder.
 * Tries custom native plugin first, then falls back to Capacitor Filesystem.
 */
export async function savePDF(doc: jsPDF, filename: string): Promise<{ success: boolean; path?: string }> {
  if (isCapacitor()) {
    // Strategy 1: Custom native plugin (saves to public Downloads)
    try {
      const pdfBase64 = getPDFBase64(doc);
      const result = await callNative('saveToDownloads', {
        data: pdfBase64,
        filename,
        mimeType: 'application/pdf',
      });
      return {
        success: true,
        path: result.path || 'Downloads/' + filename,
      };
    } catch (err) {
      console.warn('[InvoicePro] Custom plugin save failed, trying Filesystem fallback:', err);
    }

    // Strategy 2: Capacitor Filesystem plugin fallback
    const fsResult = await saveWithFilesystem(doc, filename);
    if (fsResult.success) {
      return fsResult;
    }

    // Strategy 3: Last resort — blob download
    try {
      doc.save(filename);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Browser: standard download
  try {
    doc.save(filename);
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Share a PDF file via Android share sheet.
 */
export async function sharePDF(doc: jsPDF, filename: string, title: string): Promise<boolean> {
  if (isCapacitor()) {
    // Strategy 1: Custom native plugin (shares actual file)
    try {
      const pdfBase64 = getPDFBase64(doc);
      const result = await callNative('shareFile', {
        data: pdfBase64,
        filename,
        title,
        mimeType: 'application/pdf',
        text: `${title} - InvoicePro`,
        dialogTitle: `Share ${filename}`,
      });
      return result.success === true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
      console.warn('[InvoicePro] Custom plugin share failed, trying fallback:', err);
    }

    // Strategy 2: Save file first, then share via Capacitor Share plugin
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const pdfBase64 = getPDFBase64(doc);

      const fileResult = await Filesystem.writeFile({
        path: `shared_${filename}`,
        data: pdfBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title,
        text: `${title} - InvoicePro`,
        url: fileResult.uri,
        dialogTitle: `Share ${filename}`,
      });
      return true;
    } catch (shareErr: unknown) {
      const errMsg = shareErr instanceof Error ? shareErr.message : String(shareErr);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
      console.warn('[InvoicePro] Share fallback failed:', shareErr);
    }

    // Strategy 3: Just save the file and tell user where it is
    const fsResult = await saveWithFilesystem(doc, filename);
    return fsResult.success;
  }

  // Browser fallback
  try {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return true;
    }
    doc.save(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Print a PDF.
 */
export async function printPDF(doc: jsPDF, filename: string): Promise<boolean> {
  if (isCapacitor()) {
    // Strategy 1: Custom native plugin
    try {
      const pdfBase64 = getPDFBase64(doc);
      const result = await callNative('printFile', {
        data: pdfBase64,
        filename,
      });
      return result.success === true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
      console.warn('[InvoicePro] Custom plugin print failed, trying fallback:', err);
    }

    // Strategy 2: Save file then share (share sheet has Print option)
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const pdfBase64 = getPDFBase64(doc);

      const fileResult = await Filesystem.writeFile({
        path: `print_${filename}`,
        data: pdfBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: `Print ${filename}`,
        url: fileResult.uri,
        dialogTitle: 'Print Invoice',
      });
      return true;
    } catch (shareErr: unknown) {
      const errMsg = shareErr instanceof Error ? shareErr.message : String(shareErr);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
    }

    // Strategy 3: Just save the file
    const fsResult = await saveWithFilesystem(doc, filename);
    return fsResult.success;
  }

  // Browser fallback
  try {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    return true;
  } catch {
    return false;
  }
}

/**
 * Share PDF via email.
 */
export async function emailPDF(
  doc: jsPDF,
  filename: string,
  subject: string,
  body: string
): Promise<boolean> {
  if (isCapacitor()) {
    // Strategy 1: Custom native plugin (shares file as email attachment)
    try {
      const pdfBase64 = getPDFBase64(doc);
      const result = await callNative('shareFile', {
        data: pdfBase64,
        filename,
        title: subject,
        mimeType: 'application/pdf',
        text: body,
        dialogTitle: 'Send PDF via Email',
      });
      return result.success === true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
      console.warn('[InvoicePro] Custom plugin email failed, trying fallback:', err);
    }

    // Strategy 2: Save then share via Capacitor Share
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const pdfBase64 = getPDFBase64(doc);

      const fileResult = await Filesystem.writeFile({
        path: `email_${filename}`,
        data: pdfBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: subject,
        text: body,
        url: fileResult.uri,
        dialogTitle: 'Send PDF via Email',
      });
      return true;
    } catch (shareErr: unknown) {
      const errMsg = shareErr instanceof Error ? shareErr.message : String(shareErr);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
    }

    // Strategy 3: mailto fallback
    try {
      const mailtoSubject = encodeURIComponent(subject);
      const mailtoBody = encodeURIComponent(body);
      window.open(`mailto:?subject=${mailtoSubject}&body=${mailtoBody}`, '_system');
      return true;
    } catch {
      return false;
    }
  }

  // Browser fallback
  try {
    const subjectEncoded = encodeURIComponent(subject);
    const bodyEncoded = encodeURIComponent(body);
    window.open(`mailto:?subject=${subjectEncoded}&body=${bodyEncoded}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share via WhatsApp with PDF file attached.
 */
export async function whatsappPDF(
  doc: jsPDF,
  filename: string,
  message: string
): Promise<boolean> {
  if (isCapacitor()) {
    // Strategy 1: Custom native plugin (tries WhatsApp directly)
    try {
      const pdfBase64 = getPDFBase64(doc);
      const result = await callNative('shareToWhatsApp', {
        data: pdfBase64,
        filename,
        message,
      });
      return result.success === true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
      console.warn('[InvoicePro] Custom plugin WhatsApp failed, trying fallback:', err);
    }

    // Strategy 2: Save then share via Capacitor Share
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const pdfBase64 = getPDFBase64(doc);

      const fileResult = await Filesystem.writeFile({
        path: `whatsapp_${filename}`,
        data: pdfBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: message,
        text: message,
        url: fileResult.uri,
        dialogTitle: 'Share via WhatsApp',
      });
      return true;
    } catch (shareErr: unknown) {
      const errMsg = shareErr instanceof Error ? shareErr.message : String(shareErr);
      if (errMsg.includes('cancel') || errMsg.includes('Cancel')) return true;
    }

    // Strategy 3: WhatsApp URL scheme (text only, no file)
    try {
      const msg = encodeURIComponent(message);
      window.open(`whatsapp://send?text=${msg}`, '_system');
      return true;
    } catch {
      return false;
    }
  }

  // Browser fallback
  try {
    const msg = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${msg}`);
    return true;
  } catch {
    return false;
  }
}
