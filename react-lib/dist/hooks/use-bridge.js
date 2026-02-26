import { useBridgeContext } from '../context.js';
export function useBridge() {
    const { client, status } = useBridgeContext();
    return {
        status,
        isReady: status === 'connected',
        client,
    };
}
//# sourceMappingURL=use-bridge.js.map