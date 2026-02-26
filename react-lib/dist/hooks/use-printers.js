import { useState, useEffect, useCallback } from 'react';
import { useBridgeContext } from '../context.js';
export function usePrinters() {
    const { client, status, subscribe } = useBridgeContext();
    const [available, setAvailable] = useState([]);
    const [configured, setConfigured] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await client.getPrinters();
            setAvailable(result.available);
            setConfigured(result.configured);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
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
        const unsubscribe = subscribe((event) => {
            if (event.type === 'printer:status') {
                setConfigured((prev) => prev.map((p) => p.id === event.printerId ? { ...p, status: event.status } : p));
            }
            else if (event.type === 'printer:missing') {
                setConfigured((prev) => prev.map((p) => p.id === event.printerId ? { ...p, status: 'missing' } : p));
            }
        });
        return unsubscribe;
    }, [subscribe]);
    const addPrinter = useCallback(async (config) => {
        const printer = await client.addPrinter(config);
        await refresh();
        return printer;
    }, [client, refresh]);
    const updatePrinter = useCallback(async (id, updates) => {
        const printer = await client.updatePrinter(id, updates);
        await refresh();
        return printer;
    }, [client, refresh]);
    const removePrinter = useCallback(async (id) => {
        await client.removePrinter(id);
        await refresh();
    }, [client, refresh]);
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
//# sourceMappingURL=use-printers.js.map