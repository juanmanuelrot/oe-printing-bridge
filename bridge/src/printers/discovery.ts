import nodePrinter from '@thiagoelg/node-printer';
import type { AvailablePrinter, PrinterConfig, PrinterStatus } from '../types.js';

interface NativePrinter {
  name: string;
  isDefault: boolean;
  status: string;
}

export function mapPrinterStatus(rawStatus: string): PrinterStatus {
  const s = rawStatus?.toUpperCase() ?? '';
  if (s.includes('ERROR') || s.includes('PAPER_JAM') || s.includes('PAPER_OUT')) return 'error';
  if (s.includes('OFFLINE') || s.includes('NOT_AVAILABLE')) return 'offline';
  if (s.includes('PRINTING') || s.includes('BUSY')) return 'printing';
  if (s.includes('IDLE') || s === '' || s === 'READY') return 'idle';
  return 'unknown';
}

export function discoverPrinters(configuredPrinters: PrinterConfig[]): AvailablePrinter[] {
  const rawPrinters: NativePrinter[] = nodePrinter.getPrinters();

  return rawPrinters.map((p) => {
    const configured = configuredPrinters.find((cp) => cp.address === p.name);
    return {
      name: p.name,
      status: mapPrinterStatus(p.status),
      isDefault: p.isDefault ?? false,
      configured: !!configured,
      configuredAs: configured?.id,
    };
  });
}

export function getPrinterStatus(printerName: string): PrinterStatus {
  const printers: NativePrinter[] = nodePrinter.getPrinters();
  const printer = printers.find((p) => p.name === printerName);
  if (!printer) return 'missing';
  return mapPrinterStatus(printer.status);
}
