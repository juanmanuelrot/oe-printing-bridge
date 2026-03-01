import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { ConfigManager } from '../config/config-manager.js';
import type { PrintQueue } from '../print/print-queue.js';
import type { PrinterWatcher } from '../printers/watcher.js';
import type { PrintJob } from '../types.js';
import type {
  CloudToBridgeMessage,
  BridgeToCloudMessage,
} from './protocol.js';

const RECONNECT_BASE_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export interface CloudConfig {
  serverUrl: string;
  bridgeToken: string;
}

export class CloudConnector extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private bridgeId: string | null = null;
  private cloudJobMap = new Map<string, string>(); // localJobId -> cloudJobId

  constructor(
    private cloudConfig: CloudConfig,
    private configManager: ConfigManager,
    private printQueue: PrintQueue,
    private printerWatcher: PrinterWatcher,
  ) {
    super();
    this.setupPrintQueueListeners();
    this.setupPrinterWatcherListeners();
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = this.cloudConfig.serverUrl
      .replace(/^http/, 'ws')
      .replace(/\/$/, '') + '/ws/bridge';

    console.log(`[Cloud] Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[Cloud] Connection error:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log('[Cloud] Connected, authenticating...');
      this.send({ type: 'auth', token: this.cloudConfig.bridgeToken });
    });

    this.ws.on('message', (raw: Buffer) => {
      let message: CloudToBridgeMessage;
      try {
        message = JSON.parse(raw.toString()) as CloudToBridgeMessage;
      } catch {
        return;
      }
      this.handleMessage(message);
    });

    this.ws.on('close', () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.ws = null;
      this.bridgeId = null;
      if (wasConnected) {
        console.log('[Cloud] Disconnected');
      }
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[Cloud] WebSocket error:', err.message);
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.bridgeId = null;
  }

  private handleMessage(message: CloudToBridgeMessage): void {
    switch (message.type) {
      case 'auth:ok':
        this.connected = true;
        this.reconnectAttempts = 0;
        this.bridgeId = message.bridgeId;
        console.log(`[Cloud] Authenticated as bridge ${message.bridgeId}`);
        this.reportPrinters();
        break;

      case 'auth:error':
        console.error(`[Cloud] Auth failed: ${message.error}`);
        // Don't reconnect on auth errors
        this.clearReconnectTimer();
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        break;

      case 'print:job':
        this.handlePrintJob(message.jobId, message.printerId, message.data);
        break;

      case 'ping':
        this.send({ type: 'pong' });
        break;
    }
  }

  private handlePrintJob(cloudJobId: string, localPrinterId: string, data: string): void {
    // Acknowledge receipt
    this.send({ type: 'job:received', jobId: cloudJobId });

    // Find the configured printer by local printer ID
    const printers = this.configManager.getPrinters();
    const printer = printers.find((p) => p.id === localPrinterId);

    if (!printer) {
      this.send({ type: 'job:failed', jobId: cloudJobId, error: `Printer "${localPrinterId}" not found locally` });
      return;
    }

    if (!printer.enabled) {
      this.send({ type: 'job:failed', jobId: cloudJobId, error: `Printer "${localPrinterId}" is disabled` });
      return;
    }

    // Enqueue in the local print queue
    const localJob = this.printQueue.enqueue(localPrinterId, data);
    this.cloudJobMap.set(localJob.id, cloudJobId);
  }

  private reportPrinters(): void {
    const printers = this.printerWatcher.getConfiguredPrintersWithStatus();
    this.send({
      type: 'printers:report',
      printers: printers.map((p) => ({
        localPrinterId: p.id,
        name: p.name,
        address: p.address,
        status: p.status,
      })),
    });
  }

  private setupPrintQueueListeners(): void {
    this.printQueue.on('job:started', (job: PrintJob) => {
      const cloudJobId = this.cloudJobMap.get(job.id);
      if (cloudJobId && this.connected) {
        this.send({ type: 'job:started', jobId: cloudJobId });
      }
    });

    this.printQueue.on('job:completed', (job: PrintJob) => {
      const cloudJobId = this.cloudJobMap.get(job.id);
      if (cloudJobId && this.connected) {
        this.send({ type: 'job:completed', jobId: cloudJobId });
        this.cloudJobMap.delete(job.id);
      }
    });

    this.printQueue.on('job:failed', (job: PrintJob) => {
      const cloudJobId = this.cloudJobMap.get(job.id);
      if (cloudJobId && this.connected) {
        this.send({ type: 'job:failed', jobId: cloudJobId, error: job.error ?? 'Unknown error' });
        this.cloudJobMap.delete(job.id);
      }
    });

    this.printQueue.on('job:retry', (event: { jobId: string; attempt: number; error: string }) => {
      // Retries are handled locally; we only report final status
    });
  }

  private setupPrinterWatcherListeners(): void {
    this.printerWatcher.on('printer:status', (event: { printerId: string; status: string }) => {
      if (this.connected) {
        this.send({ type: 'printer:status', localPrinterId: event.printerId, status: event.status });
      }
    });
  }

  private send(message: BridgeToCloudMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(1.5, this.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
