export interface PrinterConfig {
  id: string;
  name: string;
  address: string;
  enabled: boolean;
}

export interface PrinterWithStatus extends PrinterConfig {
  status: PrinterStatus;
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

export interface BridgeConfig {
  version: number;
  printers: PrinterConfig[];
  settings: BridgeSettings;
}

export interface BridgeSettings {
  port: number;
  maxJobHistory: number;
  jobRetryAttempts: number;
  jobRetryDelayMs: number;
}

export type WsEvent =
  | { type: 'bridge:status'; status: 'ready' }
  | { type: 'printer:status'; printerId: string; status: PrinterStatus }
  | { type: 'printer:missing'; printerId: string; printerName: string }
  | { type: 'job:queued'; job: PrintJob }
  | { type: 'job:started'; jobId: string }
  | { type: 'job:completed'; jobId: string }
  | { type: 'job:failed'; jobId: string; error: string }
  | { type: 'job:retry'; jobId: string; attempt: number; error: string };

export const DEFAULT_SETTINGS: BridgeSettings = {
  port: 9120,
  maxJobHistory: 100,
  jobRetryAttempts: 2,
  jobRetryDelayMs: 1000,
};

export const DEFAULT_CONFIG: BridgeConfig = {
  version: 1,
  printers: [],
  settings: { ...DEFAULT_SETTINGS },
};
