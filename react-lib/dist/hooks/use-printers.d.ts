import type { AvailablePrinter, PrinterConfig } from '@printer-bridge/client';
export interface UsePrintersReturn {
    available: AvailablePrinter[];
    configured: PrinterConfig[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    addPrinter: (config: {
        id: string;
        name: string;
        address: string;
        enabled?: boolean;
    }) => Promise<PrinterConfig>;
    updatePrinter: (id: string, updates: Partial<Omit<PrinterConfig, 'id'>>) => Promise<PrinterConfig>;
    removePrinter: (id: string) => Promise<void>;
}
export declare function usePrinters(): UsePrintersReturn;
//# sourceMappingURL=use-printers.d.ts.map