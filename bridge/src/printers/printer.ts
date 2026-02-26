import { isNativePrinterAvailable } from './discovery.js';

let nodePrinter: {
  printDirect(options: {
    data: Buffer;
    printer: string;
    type: string;
    success: (jobId: number) => void;
    error: (err: Error) => void;
  }): void;
} | null = null;

try {
  nodePrinter = (await import('@thiagoelg/node-printer')).default;
} catch {
  // Native module not available
}

export function printRaw(printerName: string, data: Buffer): Promise<number> {
  if (!nodePrinter) {
    return mockPrint(printerName, data);
  }

  return new Promise((resolve, reject) => {
    nodePrinter!.printDirect({
      data,
      printer: printerName,
      type: 'RAW',
      success: (jobId: number) => resolve(jobId),
      error: (err: Error) => reject(err),
    });
  });
}

async function mockPrint(printerName: string, data: Buffer): Promise<number> {
  if (!isNativePrinterAvailable()) {
    console.log(`[MOCK PRINT] → ${printerName} (${data.length} bytes)`);
    // Simulate small delay
    await new Promise((r) => setTimeout(r, 100));
    return Math.floor(Math.random() * 10000);
  }
  throw new Error(`Printer "${printerName}" not available`);
}
