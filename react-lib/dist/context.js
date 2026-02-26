import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState, useMemo, } from 'react';
import { PrintBridgeClient, } from '@printer-bridge/client';
const BridgeContext = createContext(null);
export function BridgeProvider({ children, url, options }) {
    const clientRef = useRef(null);
    const [status, setStatus] = useState('disconnected');
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
        const unsubscribe = client.on((event) => {
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
    const contextValue = useMemo(() => ({
        client,
        status,
        subscribe: (handler) => client.on(handler),
    }), [client, status]);
    return (_jsx(BridgeContext.Provider, { value: contextValue, children: children }));
}
export function useBridgeContext() {
    const ctx = useContext(BridgeContext);
    if (!ctx) {
        throw new Error('useBridge/usePrinters/usePrint must be used within <BridgeProvider>');
    }
    return ctx;
}
//# sourceMappingURL=context.js.map