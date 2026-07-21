'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, User } from 'lucide-react';
import { getClients, type ClientData } from '@/lib/local-storage';

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (client: ClientData) => void;
  onClear: () => void;
}

export default function ClientAutocomplete({ value, onChange, onSelect, onClear }: ClientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load clients lazily once
  const [clients] = useState<ClientData[]>(() => {
    if (typeof window === 'undefined') return [];
    return getClients();
  });

  // Compute filtered clients from value + clients
  const filtered = useMemo(() => {
    if (value.length < 1) return [];
    // Don't show dropdown if the current value exactly matches the selected client
    if (selectedClientName && value.toLowerCase() === selectedClientName.toLowerCase()) return [];
    return clients.filter(c =>
      c.name.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 8);
  }, [value, clients, selectedClientName]);

  // Derive isOpen from filtered results, except when manually closed
  const shouldShowDropdown = filtered.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((client: ClientData) => {
    setSelectedClientName(client.name);
    setIsOpen(false);
    onSelect(client);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setSelectedClientName(null);
    onClear();
  }, [onClear]);

  const showClearButton = selectedClientName !== null && value.toLowerCase() === selectedClientName.toLowerCase();

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedClientName(null);
            if (e.target.value.length >= 1) setIsOpen(true);
            else setIsOpen(false);
          }}
          onFocus={() => {
            if (value.length >= 1 && shouldShowDropdown) setIsOpen(true);
          }}
          placeholder="Enter client name"
          autoComplete="off"
          className={`flex h-9 w-full rounded-md border border-input bg-transparent px-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${showClearButton ? 'pr-8' : ''}`}
        />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear client selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2"
                onClick={() => handleSelect(client)}
              >
                <span className="font-medium truncate">{client.name}</span>
                {client.mobile && (
                  <span className="text-xs text-muted-foreground shrink-0">{client.mobile}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
