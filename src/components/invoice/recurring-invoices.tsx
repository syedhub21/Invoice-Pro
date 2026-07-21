'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Play, Pause, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getRecurringInvoices, saveRecurringInvoice, deleteRecurringInvoice } from '@/lib/local-storage';
import type { RecurringInvoiceData } from '@/lib/types';

export default function RecurringInvoices() {
  const [items, setItems] = useState<RecurringInvoiceData[]>(() => getRecurringInvoices());
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', frequency: 'monthly', dayOfMonth: 1 });

  const refreshItems = useCallback(() => {
    setItems(getRecurringInvoices());
  }, []);

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const nextDue = new Date();
    nextDue.setDate(form.dayOfMonth);
    const newItem: RecurringInvoiceData = {
      name: form.name,
      frequency: form.frequency,
      dayOfWeek: 1,
      dayOfMonth: form.dayOfMonth,
      monthOfYear: 1,
      startDate: new Date().toISOString(),
      nextDueDate: nextDue.toISOString(),
      active: true,
      templateData: '',
    };
    saveRecurringInvoice(newItem);
    toast.success('Recurring invoice created');
    setShowDialog(false);
    setForm({ name: '', frequency: 'monthly', dayOfMonth: 1 });
    refreshItems();
  };

  const handleToggle = (item: RecurringInvoiceData) => {
    saveRecurringInvoice({ ...item, active: !item.active });
    refreshItems();
  };

  const handleDelete = (id: string) => {
    deleteRecurringInvoice(id);
    toast.success('Deleted');
    refreshItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Recurring Invoices</h1>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowDialog(true)}>
          <Plus className="size-4 mr-1" /> New
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="size-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No recurring invoices yet</p>
          <p className="text-xs mt-1">Set up automatic invoice generation</p>
        </div>
      ) : (
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.name}</span>
                        <Badge className={item.active ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-gray-100 text-gray-500 border-0'}>
                          {item.active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{item.frequency} • Day {item.dayOfMonth}</p>
                      <p className="text-xs text-muted-foreground">Next: {format(new Date(item.nextDueDate), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggle(item)}>
                        {item.active ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => item.id && handleDelete(item.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Recurring Invoice</DialogTitle>
            <DialogDescription>Set up automatic invoice generation schedule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Rent" />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Frequency</Label>
              <Select value={form.frequency} onValueChange={(val) => setForm({ ...form, frequency: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Day of Month</Label>
              <Input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
