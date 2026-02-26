import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import {
  PrintBridgeClient,
  type BridgeClientOptions,
  type BridgeConnectionStatus,
  type WsEvent,
} from '@printer-bridge/client';

interface BridgeContextValue {
  client: PrintBridgeClient;
  status: BridgeConnectionStatus;
  subscribe: (handler: (event: WsEvent) => void) => () => void;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

export interface BridgeProviderProps {
  children: ReactNode;
  url?: string;
  options?: BridgeClientOptions;
}

export function BridgeProvider({ children, url, options }: BridgeProviderProps) {
  const clientRef = useRef<PrintBridgeClient | null>(null);
  const [status, setStatus] = useState<BridgeConnectionStatus>('disconnected');

  // Create client once
  if (!clientRef.current) {
    clientRef.current = new PrintBridgeClient({
      url: url ?? options?.url,
      ...options,
    });
  }

  const client = clientRef.current;

  useEffect(() => {
    // Track connection status changes by polling client.status
    // (since the client doesn't emit status events natively, we use WS events)
    const unsubscribe = client.on((event: WsEvent) => {
      if (event.type === 'bridge:status' && event.status === 'ready') {
        setStatus('connected');
      }
    });

    // Connect to bridge
    client.connect();
    setStatus('connecting');

    // Poll status as backup since WebSocket events drive the primary updates
    const statusInterval = setInterval(() => {
      setStatus(client.status);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  const contextValue = useMemo<BridgeContextValue>(() => ({
    client,
    status,
    subscribe: (handler: (event: WsEvent) => void) => client.on(handler),
  }), [client, status]);

  return (
    <BridgeContext.Provider value={contextValue}>
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridgeContext(): BridgeContextValue {
  const ctx = useContext(BridgeContext);
  if (!ctx) {
    throw new Error('useBridge/usePrinters/usePrint must be used within <BridgeProvider>');
  }
  return ctx;
}
