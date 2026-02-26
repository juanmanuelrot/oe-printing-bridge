import { type ReactNode } from 'react';
import { PrintBridgeClient, type BridgeClientOptions, type BridgeConnectionStatus, type WsEvent } from '@printer-bridge/client';
interface BridgeContextValue {
    client: PrintBridgeClient;
    status: BridgeConnectionStatus;
    subscribe: (handler: (event: WsEvent) => void) => () => void;
}
export interface BridgeProviderProps {
    children: ReactNode;
    url?: string;
    options?: BridgeClientOptions;
}
export declare function BridgeProvider({ children, url, options }: BridgeProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useBridgeContext(): BridgeContextValue;
export {};
//# sourceMappingURL=context.d.ts.map