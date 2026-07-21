'use client';

import { useState, useSyncExternalStore } from 'react';
import { Smartphone, Monitor, Wifi, Globe, Shield, Download, CheckCircle2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step {
  title: string;
  description: string;
  details?: string;
}

const wifiSteps: Step[] = [
  {
    title: 'Make sure your computer & phone are on the same WiFi',
    description: 'Both devices must be connected to the same local network (home WiFi, office network, mobile hotspot).',
  },
  {
    title: 'Find your computer\'s local IP address',
    description: 'Open a terminal on your computer and look for your local IP:',
    details: 'On Mac/Linux: run "ifconfig" or "ip addr"\nOn Windows: run "ipconfig"\nLook for an address like 192.168.x.x or 10.0.x.x',
  },
  {
    title: 'Open the app on your phone',
    description: 'In your phone\'s browser, go to: http://YOUR_COMPUTER_IP:3000\nExample: http://192.168.1.5:3000',
  },
  {
    title: 'Bookmark or Add to Home Screen',
    description: 'Tap the browser menu (⋮ or Share icon) and select "Add to Home Screen" or "Bookmark" for quick access.',
  },
];

const tunnelSteps: Step[] = [
  {
    title: 'Install Cloudflare Tunnel (one-time)',
    description: 'No account needed. Download cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\nOr run: brew install cloudflared (Mac)',
  },
  {
    title: 'Start the tunnel',
    description: 'Open a new terminal and run:\ncloudflared tunnel --url http://localhost:3000\nIt will give you a free HTTPS URL like: https://xxx-yyy.trycloudflare.com',
  },
  {
    title: 'Open the HTTPS URL on your phone',
    description: 'Copy the HTTPS URL from the terminal output and open it in your phone\'s browser.',
  },
  {
    title: 'Install as PWA',
    description: 'In Chrome: tap menu (⋮) → "Install app" or "Add to Home Screen"\nIn Safari: tap Share → "Add to Home Screen"\nThe app will appear as a native app on your phone!',
  },
];

function StepItem({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-bold shrink-0">
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-emerald-200 dark:bg-emerald-800 my-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-semibold">{step.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{step.description}</p>
        {step.details && (
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line bg-muted/50 rounded-md p-2 font-mono">
            {step.details}
          </p>
        )}
      </div>
    </div>
  );
}

export function PhoneSetupGuide() {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  // Detect if running as standalone PWA
  const emptySubscribe = () => () => {};
  const isStandalone = useSyncExternalStore(
    emptySubscribe,
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    () => false,
  );

  const toggleMethod = (method: string) => {
    setExpandedMethod(expandedMethod === method ? null : method);
  };

  const handleCopyCommand = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <Card className={`border-2 ${isStandalone ? 'border-emerald-300 dark:border-emerald-700' : 'border-amber-300 dark:border-amber-700'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${isStandalone ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}>
              {isStandalone ? (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Smartphone className="size-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isStandalone ? 'Running as Standalone App!' : 'Running in Browser Mode'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isStandalone
                  ? 'InvoicePro is installed on your device. All features work offline.'
                  : 'Install as a PWA for the best mobile experience — works like a native app!'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Monitor className="size-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">How Phone Access Works</CardTitle>
              <CardDescription>Your computer runs the app, your phone connects to it</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <Monitor className="size-6 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs font-medium">Computer</p>
              <p className="text-[10px] text-muted-foreground">Runs the app</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
              <Wifi className="size-6 mx-auto text-blue-600 mb-1" />
              <p className="text-xs font-medium">WiFi/Tunnel</p>
              <p className="text-[10px] text-muted-foreground">Connection</p>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3">
              <Smartphone className="size-6 mx-auto text-purple-600 mb-1" />
              <p className="text-xs font-medium">Phone</p>
              <p className="text-[10px] text-muted-foreground">Uses the app</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            All your data (invoices, profile, settings) is stored <strong>locally in your phone&apos;s browser</strong> using
            localStorage. Once the app is loaded, it works even without internet. PDF generation also works offline!
          </p>
        </CardContent>
      </Card>

      {/* Method 1: WiFi */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleMethod('wifi')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Wifi className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Method 1: Same WiFi (Easiest)</CardTitle>
                <CardDescription>No extra software needed</CardDescription>
              </div>
            </div>
            {expandedMethod === 'wifi' ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
          </div>
        </CardHeader>
        {expandedMethod === 'wifi' && (
          <CardContent>
            <div className="space-y-0">
              {wifiSteps.map((step, i) => (
                <StepItem key={i} step={step} index={i} isLast={i === wifiSteps.length - 1} />
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Shield className="size-3" /> Note
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                WiFi access uses HTTP (not HTTPS). The app works fine, but PWA install prompt may not appear.
                For full PWA install, use Method 2 (Tunnel).
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Method 2: Tunnel (Best for PWA) */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleMethod('tunnel')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Globe className="size-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Method 2: Free HTTPS Tunnel (Best)</CardTitle>
                <CardDescription>Enables PWA install on your phone</CardDescription>
              </div>
            </div>
            {expandedMethod === 'tunnel' ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
          </div>
        </CardHeader>
        {expandedMethod === 'tunnel' && (
          <CardContent>
            <div className="space-y-0">
              {tunnelSteps.map((step, i) => (
                <StepItem key={i} step={step} index={i} isLast={i === tunnelSteps.length - 1} />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium">Quick copy tunnel command:</p>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                <code className="text-xs flex-1 font-mono">cloudflared tunnel --url http://localhost:3000</code>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleCopyCommand('cloudflared tunnel --url http://localhost:3000')}>
                  {copiedIp ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </Button>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Recommended
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                This is the best method because HTTPS allows full PWA installation. Once installed,
                the app appears on your home screen like a native app with its own icon and no browser bar!
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* After PWA Install */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleMethod('after')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Download className="size-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">After Installing as PWA</CardTitle>
                <CardDescription>What happens next</CardDescription>
              </div>
            </div>
            {expandedMethod === 'after' ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
          </div>
        </CardHeader>
        {expandedMethod === 'after' && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">The app appears on your home screen with its own icon</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">No browser address bar — looks and feels like a native app</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">All your invoices and data are stored locally on your phone</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">Works offline once loaded — create invoices anywhere, anytime</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">PDF generation works offline too</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs">Share PDFs via WhatsApp, Email, etc. using the Share button</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Important</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Your computer needs to be running (with `bun run dev`) for the app to load the first time.
                After the initial load, the service worker caches everything and the app works offline.
                However, to get the freshest version, you should load the app while your computer is running.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleMethod('faq')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">FAQ</CardTitle>
            {expandedMethod === 'faq' ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
          </div>
        </CardHeader>
        {expandedMethod === 'faq' && (
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold">Do I need internet to use the app?</p>
              <p className="text-xs text-muted-foreground">No! Once the app is loaded, it works 100% offline. All data is stored in your phone&apos;s browser.</p>
            </div>
            <div>
              <p className="text-xs font-semibold">What if my computer is off?</p>
              <p className="text-xs text-muted-foreground">The app will still work from cache if you&apos;ve loaded it at least once. You just won&apos;t get updates until your computer is running again.</p>
            </div>
            <div>
              <p className="text-xs font-semibold">Is my data safe?</p>
              <p className="text-xs text-muted-foreground">All data stays on your phone in localStorage. Nothing is sent to any server. Use the Export feature to back up your data regularly.</p>
            </div>
            <div>
              <p className="text-xs font-semibold">Can I use it on multiple phones?</p>
              <p className="text-xs text-muted-foreground">Yes, but each phone has its own data. Use the Export/Import feature to transfer data between devices.</p>
            </div>
            <div>
              <p className="text-xs font-semibold">Why tunnel instead of just WiFi?</p>
              <p className="text-xs text-muted-foreground">PWA installation (home screen icon, no browser bar) requires HTTPS. Tunnels provide free HTTPS. WiFi only gives HTTP.</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
