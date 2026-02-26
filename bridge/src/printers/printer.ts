import nodePrinter from '@thiagoelg/node-printer';

export function printRaw(printerName: string, data: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    nodePrinter.printDirect({
      data,
      printer: printerName,
      type: 'RAW',
      success: (jobId: number) => resolve(jobId),
      error: (err: Error) => reject(err),
    });
  });
}
