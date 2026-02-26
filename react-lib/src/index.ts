export { BridgeProvider, type BridgeProviderProps } from './context.js';
export { useBridge, type UseBridgeReturn } from './hooks/use-bridge.js';
export { usePrinters, type UsePrintersReturn } from './hooks/use-printers.js';
export { usePrint, type UsePrintReturn } from './hooks/use-print.js';

// Re-export client types for convenience
export type {
  PrintBridgeClient,
  AvailablePrinter,
  BridgeClientOptions,
  BridgeConnectionStatus,
  BridgeStatusResponse,
  PrinterConfig,
  PrinterStatus,
  PrintJob,
  PrintResponse,
  WsEvent,
} from '@printer-bridge/client';
