import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type { ConfigManager } from '../config/config-manager.js';
import type { PrintJob } from '../types.js';
import { printRaw } from '../printers/printer.js';

export class PrintQueue extends EventEmitter {
  private queue: PrintJob[] = [];
  private history: PrintJob[] = [];
  private processing = false;

  constructor(
    private configManager: ConfigManager,
    private maxHistory = 100,
    private retryAttempts = 2,
    private retryDelayMs = 1000,
  ) {
    super();
  }

  enqueue(printerId: string, data: string): PrintJob {
    const job: PrintJob = {
      id: nanoid(),
      printerId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    // Store base64 data on the job object for internal use
    (job as PrintJob & { _data: string })._data = data;

    this.queue.push(job);
    this.emit('job:queued', job);
    void this.processNext();
    return job;
  }

  getRecentJobs(limit = 20): PrintJob[] {
    return this.history.slice(0, limit);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const job = this.queue.shift()!;
    job.status = 'printing';
    this.emit('job:started', job);

    try {
      await this.dispatch(job);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      this.emit('job:completed', job);
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date().toISOString();
      this.emit('job:failed', job);
    }

    // Clean up internal data
    delete (job as PrintJob & { _data?: string })._data;

    this.history.unshift(job);
    if (this.history.length > this.maxHistory) {
      this.history.length = this.maxHistory;
    }

    this.processing = false;
    void this.processNext();
  }

  private async dispatch(job: PrintJob): Promise<void> {
    const printer = this.configManager.getPrinter(job.printerId);
    if (!printer) {
      throw new Error(`Printer "${job.printerId}" not found in configuration`);
    }
    if (!printer.enabled) {
      throw new Error(`Printer "${job.printerId}" is disabled`);
    }

    const data = (job as PrintJob & { _data: string })._data;
    const buffer = Buffer.from(data, 'base64');
    const maxAttempts = this.retryAttempts + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await printRaw(printer.address, buffer);
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.emit('job:retry', {
          jobId: job.id,
          attempt,
          error: errorMsg,
        });
        await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
      }
    }
  }
}
