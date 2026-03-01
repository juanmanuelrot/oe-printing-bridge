import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { printers, printerGroups, printJobs } from '../db/schema.js';
import type { BridgeRegistry } from '../ws/bridge-registry.js';

export class JobRouter {
  constructor(private bridgeRegistry: BridgeRegistry) {}

  /**
   * Submit a print job. Validates access, creates the job, and routes it.
   * Returns the created job or throws on error.
   */
  async submitJob(params: {
    printerId: string;
    data: string;
    apiKeyId: string;
    groupIds: string[];
  }): Promise<{ id: string; status: string }> {
    const { printerId, data, apiKeyId, groupIds } = params;

    // Find the printer
    const [printer] = await db.select()
      .from(printers)
      .where(eq(printers.id, printerId))
      .limit(1);

    if (!printer) {
      throw new JobRouterError(404, 'Printer not found');
    }

    // Verify the API key has access to a group that contains this printer
    const assignments = await db.select({ groupId: printerGroups.groupId })
      .from(printerGroups)
      .where(and(
        eq(printerGroups.printerId, printerId),
        inArray(printerGroups.groupId, groupIds),
      ));

    if (assignments.length === 0) {
      throw new JobRouterError(403, 'API key does not have access to this printer');
    }

    // Use the first matching group
    const groupId = assignments[0].groupId;

    // Create job
    const [job] = await db.insert(printJobs).values({
      printerId,
      groupId,
      apiKeyId,
      data,
      status: 'pending',
    }).returning({ id: printJobs.id, status: printJobs.status });

    // Try to send to bridge immediately
    this.routeJob(job.id, printer.bridgeId, printer.localPrinterId, data);

    return job;
  }

  /** Attempt to send a job to the bridge. If offline, stays pending for sweep. */
  private routeJob(jobId: string, bridgeId: string, localPrinterId: string, data: string): void {
    const sent = this.bridgeRegistry.send(bridgeId, {
      type: 'print:job',
      jobId,
      printerId: localPrinterId,
      data,
    });

    if (sent) {
      void db.update(printJobs)
        .set({ status: 'sent_to_bridge', sentAt: new Date() })
        .where(eq(printJobs.id, jobId));
    }
    // If not sent, job stays 'pending' and will be picked up by sweep
  }

  /** Sweep pending jobs and try to deliver them to online bridges */
  async sweepPendingJobs(): Promise<void> {
    const pending = await db.select({
      id: printJobs.id,
      printerId: printJobs.printerId,
      data: printJobs.data,
    })
      .from(printJobs)
      .where(eq(printJobs.status, 'pending'));

    for (const job of pending) {
      const [printer] = await db.select({
        bridgeId: printers.bridgeId,
        localPrinterId: printers.localPrinterId,
      })
        .from(printers)
        .where(eq(printers.id, job.printerId))
        .limit(1);

      if (printer && this.bridgeRegistry.isOnline(printer.bridgeId)) {
        this.routeJob(job.id, printer.bridgeId, printer.localPrinterId, job.data);
      }
    }
  }

  /** Update job status from bridge feedback */
  async updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
    const updates: Record<string, unknown> = { status };

    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }
    if (error) {
      updates.error = error;
    }

    await db.update(printJobs)
      .set(updates)
      .where(eq(printJobs.id, jobId));
  }
}

export class JobRouterError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
