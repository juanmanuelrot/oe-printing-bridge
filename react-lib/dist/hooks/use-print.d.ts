import type { PrintJob, PrintResponse } from '@printer-bridge/client';
export interface UsePrintReturn {
    print: (printerKey: string, data: Uint8Array | ArrayBuffer) => Promise<PrintResponse>;
    lastJob: PrintJob | null;
    jobs: PrintJob[];
    isLoading: boolean;
    error: string | null;
}
export declare function usePrint(): UsePrintReturn;
//# sourceMappingURL=use-print.d.ts.map