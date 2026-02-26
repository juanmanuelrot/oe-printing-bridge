declare module '@thiagoelg/node-printer' {
  interface NativePrinterInfo {
    name: string;
    isDefault: boolean;
    status: string;
  }

  interface PrintDirectOptions {
    data: Buffer;
    printer: string;
    type: string;
    success: (jobId: number) => void;
    error: (err: Error) => void;
  }

  const printer: {
    getPrinters(): NativePrinterInfo[];
    printDirect(options: PrintDirectOptions): void;
  };

  export default printer;
}
