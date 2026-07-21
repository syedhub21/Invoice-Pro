'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { getClients, saveClient, deleteClient } from '@/lib/local-storage';
import { useInvoiceFormStore } from '@/store/invoice-store';
import { useAppStore } from '@/store/app-store';
import { formatAmount } from '@/lib/utils';
import type { ClientData } from '@/lib/types';

// ─── Color cycle for left border ─────────────────────────────
const BORDER_COLORS = [
  'border-l-violet-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
  'border-l-fuchsia-500',
  'border-l-teal-500',
  'border-l-orange-500',
];

// ─── Empty form template ─────────────────────────────────────
function emptyClient(): ClientData {
  return {
    id: crypto.randomUUID(),
    name: '',
    mobile: '',
    email: '',
    address: '',
    gstin: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Client Management Component ─────────────────────────────
export default function ClientManagement() {
  const { settings } = useInvoiceFormStore();
  const { setView } = useAppStore();
  const currencyCode = settings.currency;

  const [clients, setClients] = useState<ClientData[]>(() => getClients());
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [form, setForm] = useState<ClientData>(emptyClient());

  // Delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<ClientData | null>(null);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Count invoices per client from localStorage
  function getUsageCount(clientId: string): number {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('invoicepro_invoices');
      if (!raw) return 0;
      const invoices = JSON.parse(raw);
      return invoices.filter(
        (inv: Record<string, unknown>) =>
          (inv as Record<string, unknown>).clientId === clientId ||
          (inv as { clientName?: string }).clientName ===
            clients.find((c) => c.id === clientId)?.name
      ).length;
    } catch {
      return 0;
    }
  }

  // ─── Form handlers ─────────────────────────────────────────
  function openAddDialog() {
    setEditingClient(null);
    setForm(emptyClient());
    setIsFormOpen(true);
  }

  function openEditDialog(client: ClientData) {
    setEditingClient(client);
    setForm({ ...client });
    setIsFormOpen(true);
  }

  function openDeleteDialog(client: ClientData) {
    setDeletingClient(client);
    setIsDeleteOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    const clientToSave: ClientData = {
      ...form,
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      gstin: form.gstin.trim(),
      updatedAt: new Date().toISOString(),
    };

    saveClient(clientToSave);
    setClients(getClients());
    setIsFormOpen(false);
    toast.success(editingClient ? 'Client updated' : 'Client added');
  }

  function handleDelete() {
    if (!deletingClient) return;
    deleteClient(deletingClient.id);
    setClients(getClients());
    setIsDeleteOpen(false);
    setDeletingClient(null);
    toast.success('Client deleted');
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/20">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Client Management</h2>
            <p className="text-sm text-muted-foreground">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/20"
          onClick={openAddDialog}
        >
          <Plus className="size-4 mr-1.5" />
          Add Client
        </Button>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-8 mb-4">
            <Users className="size-14 text-emerald-400/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Add your first client to start creating invoices quickly with pre-filled details.
          </p>
          <Button
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
            onClick={openAddDialog}
          >
            <Plus className="size-4 mr-1.5" />
            Add Your First Client
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, index) => {
              const usageCount = getUsageCount(client.id);
              const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];

              return (
                <motion.div
                  key={client.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.06,
                    type: 'spring',
                    stiffness: 300,
                    damping: 24,
                  }}
                >
                  <Card
                    className={`border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow duration-200`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Name + GSTIN */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">
                              {client.name}
                            </h3>
                            {client.gstin && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                              >
                                {client.gstin}
                              </Badge>
                            )}
                          </div>

                          {/* Phone & Email */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {client.mobile && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="size-3.5 text-emerald-500" />
                                <span>{client.mobile}</span>
                              </div>
                            )}
                            {client.email && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="size-3.5 text-emerald-500" />
                                <span className="truncate">{client.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Address */}
                          {client.address && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              <span className="line-clamp-1">
                                {client.address.length > 80
                                  ? client.address.slice(0, 80) + '...'
                                  : client.address}
                              </span>
                            </div>
                          )}

                          {/* Usage count */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FileText className="size-3.5 text-emerald-500" />
                            <span>
                              {usageCount} invoice{usageCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => openEditDialog(client)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => openDeleteDialog(client)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Edit Client' : 'Add Client'}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? 'Update client details below.'
                : 'Fill in client details to save them for quick invoice creation.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Client or business name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mobile</label>
              <Input
                placeholder="Phone number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                placeholder="Email address"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Address</label>
              <Input
                placeholder="Full address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {/* GSTIN */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">GSTIN</label>
              <Input
                placeholder="GST Identification Number"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
              onClick={handleSave}
            >
              {editingClient ? 'Update Client' : 'Add Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deletingClient?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
