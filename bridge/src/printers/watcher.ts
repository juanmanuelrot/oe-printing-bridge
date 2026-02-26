import { EventEmitter } from 'node:events';
import type { ConfigManager } from '../config/config-manager.js';
import type { PrinterStatus, PrinterWithStatus } from '../types.js';
import { getPrinterStatus } from './discovery.js';

const POLL_INTERVAL_MS = 30_000;

export class PrinterWatcher extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastStatuses = new Map<string, PrinterStatus>();

  constructor(private configManager: ConfigManager) {
    super();
  }

  start(): void {
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  poll(): void {
    const printers = this.configManager.getPrinters();

    for (const printer of printers) {
      if (!printer.enabled) continue;

      const status = getPrinterStatus(printer.address);
      const prevStatus = this.lastStatuses.get(printer.id);

      if (prevStatus !== status) {
        this.lastStatuses.set(printer.id, status);

        if (status === 'missing') {
          this.emit('printer:missing', {
            printerId: printer.id,
            printerName: printer.address,
          });
        }

        this.emit('printer:status', {
          printerId: printer.id,
          status,
        });
      }
    }
  }

  getConfiguredPrintersWithStatus(): PrinterWithStatus[] {
    const printers = this.configManager.getPrinters();
    return printers.map((p) => ({
      ...p,
      status: this.lastStatuses.get(p.id) ?? 'unknown',
    }));
  }

  getPrinterStatus(printerId: string): PrinterStatus {
    return this.lastStatuses.get(printerId) ?? 'unknown';
  }
}
