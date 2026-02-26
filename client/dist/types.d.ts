export interface PrinterConfig {
    id: string;
    name: string;
    address: string;
    enabled: boolean;
    status?: PrinterStatus;
}
export type PrinterStatus = 'idle' | 'printing' | 'error' | 'offline' | 'missing' | 'unknown';
export interface AvailablePrinter {
    name: string;
    status: PrinterStatus;
    isDefault: boolean;
    configured: boolean;
    configuredAs?: string;
}
export interface PrintJob {
    id: string;
    printerId: string;
    status: 'queued' | 'printing' | 'completed' | 'failed';
    error?: string;
    createdAt: string;
    completedAt?: string;
}
export interface BridgeStatusResponse {
    status: string;
    version: string;
    uptime: number;
    queueLength: number;
    nativePrinterAvailable: boolean;
}
export interface PrintResponse {
    jobId: string;
    status: string;
    queuePosition: number;
}
export type BridgeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type WsEvent = {
    type: 'bridge:status';
    status: 'ready';
} | {
    type: 'printer:status';
    printerId: string;
    status: PrinterStatus;
} | {
    type: 'printer:missing';
    printerId: string;
    printerName: string;
} | {
    type: 'job:queued';
    job: PrintJob;
} | {
    type: 'job:started';
    jobId: string;
} | {
    type: 'job:completed';
    jobId: string;
} | {
    type: 'job:failed';
    jobId: string;
    error: string;
} | {
    type: 'job:retry';
    jobId: string;
    attempt: number;
    error: string;
};
export interface BridgeClientOptions {
    url?: string;
    wsUrl?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}
//# sourceMappingURL=types.d.ts.map