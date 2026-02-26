import { useBridgeContext } from '../context.js';
import type { PrintBridgeClient, BridgeConnectionStatus } from '@printer-bridge/client';

export interface UseBridgeReturn {
  status: BridgeConnectionStatus;
  isReady: boolean;
  client: PrintBridgeClient;
}

export function useBridge(): UseBridgeReturn {
  const { client, status } = useBridgeContext();

  return {
    status,
    isReady: status === 'connected',
    client,
  };
}
