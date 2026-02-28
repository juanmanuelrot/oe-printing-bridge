import { useState, useEffect, useCallback } from 'react';
import { useBridgeContext } from '../context.js';
import type { AvailablePrinter, PrinterConfig, WsEvent } from '@ordereat-uy/printer-bridge-client';

export interface UsePrintersReturn {
  available: AvailablePrinter[];
  configured: PrinterConfig[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addPrinter: (config: { id: string; name: string; address: string; enabled?: boolean }) => Promise<PrinterConfig>;
  updatePrinter: (id: string, updates: Partial<Omit<PrinterConfig, 'id'>>) => Promise<PrinterConfig>;
  removePrinter: (id: string) => Promise<void>;
}

export function usePrinters(): UsePrintersReturn {
  const { client, status, subscribe } = useBridgeContext();
  const [available, setAvailable] = useState<AvailablePrinter[]>([]);
  const [configured, setConfigured] = useState<PrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.getPrinters();
      setAvailable(result.available);
      setConfigured(result.configured);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Fetch on mount and when connection status changes to connected
  useEffect(() => {
    if (status === 'connected') {
      void refresh();
    }
  }, [status, refresh]);

  // Listen for printer status/missing events to update configured printers
  useEffect(() => {
    const unsubscribe = subscribe((event: WsEvent) => {
      if (event.type === 'printer:status') {
        setConfigured((prev) =>
          prev.map((p) =>
            p.id === event.printerId ? { ...p, status: event.status } : p,
          ),
        );
      } else if (event.type === 'printer:missing') {
        setConfigured((prev) =>
          prev.map((p) =>
            p.id === event.printerId ? { ...p, status: 'missing' } : p,
          ),
        );
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const addPrinter = useCallback(
    async (config: { id: string; name: string; address: string; enabled?: boolean }) => {
      const printer = await client.addPrinter(config);
      await refresh();
      return printer;
    },
    [client, refresh],
  );

  const updatePrinter = useCallback(
    async (id: string, updates: Partial<Omit<PrinterConfig, 'id'>>) => {
      const printer = await client.updatePrinter(id, updates);
      await refresh();
      return printer;
    },
    [client, refresh],
  );

  const removePrinter = useCallback(
    async (id: string) => {
      await client.removePrinter(id);
      await refresh();
    },
    [client, refresh],
  );

  return {
    available,
    configured,
    isLoading,
    error,
    refresh,
    addPrinter,
    updatePrinter,
    removePrinter,
  };
}
