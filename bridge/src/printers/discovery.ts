import type { AvailablePrinter, PrinterConfig, PrinterStatus } from '../types.js';
import { getPrinters } from './powershell.js';

export function mapPrinterStatus(rawStatus: string): PrinterStatus {
  const s = rawStatus?.toUpperCase() ?? '';
  if (s.includes('ERROR') || s.includes('PAPER_JAM') || s.includes('PAPER_OUT')) return 'error';
  if (s.includes('OFFLINE') || s.includes('NOT_AVAILABLE')) return 'offline';
  if (s.includes('PRINTING') || s.includes('BUSY')) return 'printing';
  if (s.includes('IDLE') || s === '' || s === 'READY' || s === 'NORMAL' || s === '0') return 'idle';
  return 'unknown';
}

export async function discoverPrinters(configuredPrinters: PrinterConfig[]): Promise<AvailablePrinter[]> {
  const rawPrinters = await getPrinters();

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

export async function getPrinterStatus(printerName: string): Promise<PrinterStatus> {
  const { getPrinterStatus: getStatus } = await import('./powershell.js');
  const status = await getStatus(printerName);
  if (status === 'NOT_FOUND') return 'missing';
  return mapPrinterStatus(status);
}
