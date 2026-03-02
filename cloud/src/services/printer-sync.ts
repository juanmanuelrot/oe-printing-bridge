import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { printers } from '../db/schema.js';

interface ReportedPrinter {
  localPrinterId: string;
  name: string;
  address: string;
  status: string;
}

export class PrinterSync {
  /** Upsert all printers reported by a bridge */
  async syncPrinters(bridgeId: string, reported: ReportedPrinter[]): Promise<void> {
    const reportedIds = new Set(reported.map((p) => p.localPrinterId));

    // Get existing printers for this bridge
    const existing = await db.select()
      .from(printers)
      .where(eq(printers.bridgeId, bridgeId));

    // Remove printers that are no longer reported
    for (const printer of existing) {
      if (!reportedIds.has(printer.localPrinterId)) {
        await db.delete(printers)
          .where(eq(printers.id, printer.id));
      }
    }

    // Upsert reported printers
    for (const rp of reported) {
      const [existingPrinter] = await db.select()
        .from(printers)
        .where(and(
          eq(printers.bridgeId, bridgeId),
          eq(printers.localPrinterId, rp.localPrinterId),
        ))
        .limit(1);

      if (existingPrinter) {
        await db.update(printers)
          .set({
            name: rp.name,
            address: rp.address,
            status: rp.status,
          })
          .where(eq(printers.id, existingPrinter.id));
      } else {
        await db.insert(printers).values({
          bridgeId,
          localPrinterId: rp.localPrinterId,
          name: rp.name,
          address: rp.address,
          status: rp.status,
        });
      }
    }
  }

  /** Update a single printer's status */
  async updateStatus(bridgeId: string, localPrinterId: string, status: string): Promise<void> {
    await db.update(printers)
      .set({ status })
      .where(and(
        eq(printers.bridgeId, bridgeId),
        eq(printers.localPrinterId, localPrinterId),
      ));
  }
}
