'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('invoicepro-install-dismissed');
    if (dismissed) return;
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); setShowBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => { window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (error) { console.error('Install prompt error:', error); }
    finally { setDeferredPrompt(null); setShowBanner(false); }
  };

  const handleDismiss = () => {
    localStorage.setItem('invoicepro-install-dismissed', 'true');
    setShowBanner(false); setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 p-4">
      <Card className="border-emerald-200 dark:border-emerald-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <Download className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Install InvoicePro</p>
              <p className="text-xs text-muted-foreground mt-0.5">Access offline anytime</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" onClick={handleInstall} className="bg-emerald-600 hover:bg-emerald-700 text-white">Install</Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} aria-label="Dismiss"><X className="size-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
