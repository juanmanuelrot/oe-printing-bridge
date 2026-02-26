import type { AvailablePrinter, BridgeClientOptions, BridgeConnectionStatus, BridgeStatusResponse, PrinterConfig, PrintJob, PrintResponse, WsEvent } from './types.js';
type EventHandler = (event: WsEvent) => void;
export declare class PrintBridgeClient {
    private options;
    private ws;
    private handlers;
    private typedHandlers;
    private reconnectTimer;
    private reconnectAttempts;
    private _status;
    private _autoReconnect;
    constructor(options?: BridgeClientOptions);
    get status(): BridgeConnectionStatus;
    get isConnected(): boolean;
    connect(): void;
    disconnect(): void;
    /** Subscribe to all WebSocket events */
    on(handler: EventHandler): () => void;
    /** Subscribe to a specific event type */
    on(eventType: WsEvent['type'], handler: EventHandler): () => void;
    off(handler: EventHandler): void;
    off(eventType: WsEvent['type'], handler: EventHandler): void;
    getStatus(): Promise<BridgeStatusResponse>;
    getAvailablePrinters(): Promise<AvailablePrinter[]>;
    getConfiguredPrinters(): Promise<PrinterConfig[]>;
    getPrinters(): Promise<{
        available: AvailablePrinter[];
        configured: PrinterConfig[];
    }>;
    addPrinter(config: {
        id: string;
        name: string;
        address: string;
        enabled?: boolean;
    }): Promise<PrinterConfig>;
    updatePrinter(id: string, updates: Partial<Omit<PrinterConfig, 'id'>>): Promise<PrinterConfig>;
    removePrinter(id: string): Promise<void>;
    print(printerKey: string, data: Uint8Array | ArrayBuffer): Promise<PrintResponse>;
    getRecentJobs(limit?: number): Promise<PrintJob[]>;
    private fetch;
    private setStatus;
    private dispatchEvent;
    private scheduleReconnect;
    private clearReconnectTimer;
    private uint8ArrayToBase64;
}
export {};
//# sourceMappingURL=client.d.ts.map