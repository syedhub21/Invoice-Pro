'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { useTheme } from 'next-themes';
import { Save, Upload, Pen, Download, UploadIcon, Trash2, Building, Palette, Database, HardDrive, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import SignatureCanvas from './signature-canvas';
import { getStorageUsage, exportAllData, importAllData, clearAllData } from '@/lib/local-storage';
import { CURRENCIES, getCurrencyConfig } from '@/lib/utils';

export default function SettingsView() {
  const { profile, settings, setProfile, setSettings } = useInvoiceFormStore();
  const { setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);

  const currencyConfig = getCurrencyConfig(settings.currency);

  const handleSaveProfile = useCallback(() => {
    toast.success('Profile saved!');
  }, []);

  const handleSaveSettings = useCallback(() => {
    toast.success('Settings saved!');
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { setProfile({ logoPath: reader.result as string }); toast.success('Logo uploaded'); };
    reader.readAsDataURL(file);
  }, [setProfile]);

  const handleExport = useCallback(() => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoicepro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (importAllData(data)) {
          toast.success('Data imported! Refresh to see changes.');
        } else {
          toast.error('Import failed');
        }
      } catch { toast.error('Invalid file'); }
    };
    input.click();
  }, []);

  const handleClearAll = useCallback(() => {
    clearAllData();
    toast.success('All data cleared. Refresh to start fresh.');
  }, []);

  // Storage usage
  const storageUsage = useMemo(() => getStorageUsage(), []);
  const usagePercent = Math.round((storageUsage.used / storageUsage.total) * 100);

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="prefs">Preferences</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40"><Building className="size-4 text-emerald-600" /></div>
                <div><CardTitle className="text-base">Business Profile</CardTitle>
                  <CardDescription>Your company details on invoices</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Business Logo</Label>
                <div className="flex items-center gap-3">
                  {profile.logoPath ? (
                    <img src={profile.logoPath} alt="Logo" className="w-16 h-16 object-contain border rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                      <Upload className="size-6" />
                    </div>
                  )}
                  <div>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                      <UploadIcon className="size-3 mr-1" /> Upload Logo
                    </Button>
                    {profile.logoPath && (
                      <Button variant="ghost" size="sm" className="ml-2 text-destructive" onClick={() => setProfile({ logoPath: '' })}>
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label className="text-sm mb-1 block">Company Name</Label>
                  <Input value={profile.companyName} onChange={(e) => setProfile({ companyName: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label className="text-sm mb-1 block">Address</Label>
                  <Textarea value={profile.address} onChange={(e) => setProfile({ address: e.target.value })} rows={2} /></div>
                <div><Label className="text-sm mb-1 block">Mobile</Label>
                  <Input value={profile.mobile} onChange={(e) => setProfile({ mobile: e.target.value })} /></div>
                <div><Label className="text-sm mb-1 block">Email</Label>
                  <Input value={profile.email} onChange={(e) => setProfile({ email: e.target.value })} /></div>
                <div><Label className="text-sm mb-1 block">GSTIN</Label>
                  <Input value={profile.gstin} onChange={(e) => setProfile({ gstin: e.target.value })} /></div>
                <div><Label className="text-sm mb-1 block">PAN</Label>
                  <Input value={profile.pan} onChange={(e) => setProfile({ pan: e.target.value })} /></div>
              </div>

              <Separator />

              {/* Bank Details */}
              <h3 className="font-semibold text-sm">Bank Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-sm mb-1 block">Bank Name</Label>
                  <Input value={profile.bankName} onChange={(e) => setProfile({ bankName: e.target.value })} /></div>
                <div><Label className="text-sm mb-1 block">Account Number</Label>
                  <Input value={profile.bankAccount} onChange={(e) => setProfile({ bankAccount: e.target.value })} /></div>
                <div><Label className="text-sm mb-1 block">IFSC Code</Label>
                  <Input value={profile.bankIfsc} onChange={(e) => setProfile({ bankIfsc: e.target.value })} /></div>
                <div><Label className="text-sm mb-1 block">UPI ID</Label>
                  <Input value={profile.upiId} onChange={(e) => setProfile({ upiId: e.target.value })} /></div>
              </div>

              <Separator />

              {/* Signature */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Digital Signature</Label>
                <div className="flex items-center gap-3">
                  {profile.signaturePath ? (
                    <img src={profile.signaturePath} alt="Signature" className="h-12 object-contain border rounded" />
                  ) : (
                    <div className="h-12 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">No signature</div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSigOpen(true)}>
                    <Pen className="size-3 mr-1" /> {profile.signaturePath ? 'Redraw' : 'Draw Signature'}
                  </Button>
                  {profile.signaturePath && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setProfile({ signaturePath: '' })}>
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>

              <Separator />
              <div>
                <Label className="text-sm mb-1 block">Terms & Conditions</Label>
                <Textarea value={profile.termsConditions} onChange={(e) => setProfile({ termsConditions: e.target.value })} rows={4} />
              </div>

              <Button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white" onClick={handleSaveProfile}>
                <Save className="size-4 mr-1" /> Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Preferences Tab ─────────────────────────── */}
        <TabsContent value="prefs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40"><Palette className="size-4 text-amber-600" /></div>
                <div><CardTitle className="text-base">App Preferences</CardTitle>
                  <CardDescription>Customize your experience</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Dark Mode</Label>
                <Switch checked={settings.darkMode} onCheckedChange={(checked) => { setSettings({ darkMode: checked }); setTheme(checked ? 'dark' : 'light'); }} className="data-[state=checked]:bg-emerald-600" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-Save Drafts</Label>
                <Switch checked={settings.autoSave} onCheckedChange={(checked) => setSettings({ autoSave: checked })} className="data-[state=checked]:bg-emerald-600" />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Default Template</Label>
                <Select value={settings.defaultTemplate} onValueChange={(val) => setSettings({ defaultTemplate: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">Default Tax Rate (%)</Label>
                <Input type="number" value={settings.taxRateDefault} onChange={(e) => setSettings({ taxRateDefault: parseFloat(e.target.value) || 0 })} />
              </div>

              <Separator />

              {/* Currency */}
              <h3 className="font-semibold text-sm">Currency</h3>
              <div className="space-y-3">
                <Select value={settings.currency} onValueChange={(val) => setSettings({ currency: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium">Active: {currencyConfig.symbol} {currencyConfig.code} ({currencyConfig.name})</p>
                </div>
              </div>

              <Separator />

              {/* Invoice Number Format */}
              <h3 className="font-semibold text-sm">Invoice Number Format</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Prefix</Label>
                  <Input value={settings.invoicePrefix} onChange={(e) => setSettings({ invoicePrefix: e.target.value })} placeholder="INV-" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Digits</Label>
                  <Select value={String(settings.invoiceDigits)} onValueChange={(val) => setSettings({ invoiceDigits: parseInt(val) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 (001)</SelectItem>
                      <SelectItem value="4">4 (0001)</SelectItem>
                      <SelectItem value="5">5 (00001)</SelectItem>
                      <SelectItem value="6">6 (000001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs">Preview: <span className="font-mono font-bold">{settings.invoicePrefix}{String(1).padStart(settings.invoiceDigits, '0')}</span></p>
              </div>

              <Separator />

              <h3 className="font-semibold text-sm">Optional Modules</h3>
              <div className="flex items-center justify-between">
                <Label className="text-sm">QR Code on Invoices</Label>
                <Switch checked={settings.qrEnabled} onCheckedChange={(checked) => setSettings({ qrEnabled: checked })} className="data-[state=checked]:bg-emerald-600" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Digital Signature</Label>
                <Switch checked={settings.signatureEnabled} onCheckedChange={(checked) => setSettings({ signatureEnabled: checked })} className="data-[state=checked]:bg-emerald-600" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Recurring Invoices</Label>
                <Switch checked={settings.recurringEnabled} onCheckedChange={(checked) => setSettings({ recurringEnabled: checked })} className="data-[state=checked]:bg-emerald-600" />
              </div>

              <Button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white" onClick={handleSaveSettings}>
                <Save className="size-4 mr-1" /> Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Phone Tab ───────────────────────────────── */}
        <TabsContent value="phone" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📱 Run on Your Phone</CardTitle>
              <CardDescription>Access InvoicePro on your mobile device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Option 1: PWA Install (Recommended)</h3>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5">
                  <li>Open this URL in Chrome/Safari on your phone</li>
                  <li>Tap &quot;Install&quot; when the banner appears</li>
                  <li>Or: Chrome menu → &quot;Install app&quot; / Safari Share → &quot;Add to Home Screen&quot;</li>
                  <li>App opens standalone, works offline!</li>
                </ol>
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Option 2: Same WiFi</h3>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5">
                  <li>Run <code className="bg-muted px-1 rounded">bun run dev</code> on your computer</li>
                  <li>Find your computer&apos;s local IP</li>
                  <li>Open <code className="bg-muted px-1 rounded">http://YOUR_IP:3000</code> on phone</li>
                </ol>
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Option 3: Tunnel (Free HTTPS)</h3>
                <p className="text-sm text-muted-foreground">
                  Run <code className="bg-muted px-1 rounded">bun run tunnel</code> to get a public HTTPS URL.
                  Required for PWA install on Chrome.
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  💡 Once loaded, the app works 100% offline! No server needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Data Tab ────────────────────────────────── */}
        <TabsContent value="data" className="space-y-4 mt-4">
          {/* Storage Usage */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40"><HardDrive className="size-4 text-emerald-600" /></div>
                <div><CardTitle className="text-base">Storage Usage</CardTitle>
                  <CardDescription>Local browser storage</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Used: {(storageUsage.used / 1024).toFixed(1)} KB</span>
                <span className="font-medium">{usagePercent}%</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {storageUsage.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between text-xs rounded-lg bg-muted/30 px-2 py-1.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{(item.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export/Import */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40"><Database className="size-4 text-sky-600" /></div>
                <div><CardTitle className="text-base">Data Management</CardTitle>
                  <CardDescription>Backup and restore</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleExport}>
                <Download className="size-4 mr-1" /> Export
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleImport}>
                <UploadIcon className="size-4 mr-1" /> Import
              </Button>
            </CardContent>
          </Card>

          {/* Clear All Data - Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="size-4 text-destructive" /></div>
                <div><CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="size-4 mr-1" /> Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your invoices, clients, expenses, and settings. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, clear everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Signature Canvas Dialog */}
      <SignatureCanvas
        open={sigOpen}
        onClose={() => setSigOpen(false)}
        onSave={(dataUrl: string) => { setProfile({ signaturePath: dataUrl }); setSigOpen(false); }}
      />
    </div>
  );
}
