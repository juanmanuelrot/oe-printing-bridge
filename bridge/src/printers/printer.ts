import { printRaw as psPrintRaw } from './powershell.js';

export async function printRaw(printerName: string, data: Buffer): Promise<void> {
  await psPrintRaw(printerName, data);
}
