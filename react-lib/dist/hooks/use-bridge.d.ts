import type { PrintBridgeClient, BridgeConnectionStatus } from '@printer-bridge/client';
export interface UseBridgeReturn {
    status: BridgeConnectionStatus;
    isReady: boolean;
    client: PrintBridgeClient;
}
export declare function useBridge(): UseBridgeReturn;
//# sourceMappingURL=use-bridge.d.ts.map