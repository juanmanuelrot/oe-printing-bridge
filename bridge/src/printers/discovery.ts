import type { AvailablePrinter, PrinterConfig, PrinterStatus } from '../types.js';

interface NativePrinter {
  name: string;
  isDefault: boolean;
  status: string;
}

let nodePrinter: {
  getPrinters(): NativePrinter[];
} | null = null;

try {
  nodePrinter = (await import('@thiagoelg/node-printer')).default;
  console.log('Native printer module loaded successfully');
} catch (err) {
  console.warn('Native printer module not available:', (err as Error).message);
  console.warn('Falling back to mock printers');
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
  if (!nodePrinter) {
    return getMockPrinters(configuredPrinters);
  }

  const rawPrinters = nodePrinter.getPrinters();

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
  if (!nodePrinter) return 'idle';

  const printers = nodePrinter.getPrinters();
  const printer = printers.find((p) => p.name === printerName);
  if (!printer) return 'missing';
  return mapPrinterStatus(printer.status);
}

export function isNativePrinterAvailable(): boolean {
  return nodePrinter !== null;
}

function getMockPrinters(configuredPrinters: PrinterConfig[]): AvailablePrinter[] {
  const mocks: AvailablePrinter[] = [
    { name: 'Mock Thermal Printer', status: 'idle', isDefault: true, configured: false },
    { name: 'Mock Kitchen Printer', status: 'idle', isDefault: false, configured: false },
    { name: 'Mock Bar Printer', status: 'offline', isDefault: false, configured: false },
  ];

  return mocks.map((m) => {
    const configured = configuredPrinters.find((cp) => cp.address === m.name);
    return {
      ...m,
      configured: !!configured,
      configuredAs: configured?.id,
    };
  });
}
