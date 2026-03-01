import type { WebSocket } from 'ws';
import type { CloudToBridgeMessage } from './protocol.js';

interface ConnectedBridge {
  bridgeId: string;
  userId: string;
  ws: WebSocket;
  pingTimer: ReturnType<typeof setInterval> | null;
}

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 15_000;

export class BridgeRegistry {
  private connections = new Map<string, ConnectedBridge>();

  register(bridgeId: string, userId: string, ws: WebSocket): void {
    // Close existing connection for this bridge if any
    const existing = this.connections.get(bridgeId);
    if (existing) {
      this.clearPing(existing);
      existing.ws.close();
    }

    const entry: ConnectedBridge = { bridgeId, userId, ws, pingTimer: null };
    this.connections.set(bridgeId, entry);
    this.startPing(entry);
  }

  unregister(bridgeId: string): void {
    const entry = this.connections.get(bridgeId);
    if (entry) {
      this.clearPing(entry);
      this.connections.delete(bridgeId);
    }
  }

  isOnline(bridgeId: string): boolean {
    return this.connections.has(bridgeId);
  }

  send(bridgeId: string, message: CloudToBridgeMessage): boolean {
    const entry = this.connections.get(bridgeId);
    if (!entry || entry.ws.readyState !== 1 /* OPEN */) return false;

    entry.ws.send(JSON.stringify(message));
    return true;
  }

  getBridgeId(ws: WebSocket): string | undefined {
    for (const [bridgeId, entry] of this.connections) {
      if (entry.ws === ws) return bridgeId;
    }
    return undefined;
  }

  private startPing(entry: ConnectedBridge): void {
    entry.pingTimer = setInterval(() => {
      if (entry.ws.readyState !== 1) {
        this.unregister(entry.bridgeId);
        return;
      }

      let pongReceived = false;
      const originalOnMessage = entry.ws.onmessage;

      const pongTimeout = setTimeout(() => {
        if (!pongReceived) {
          console.log(`Bridge ${entry.bridgeId}: pong timeout, disconnecting`);
          entry.ws.close();
          this.unregister(entry.bridgeId);
        }
      }, PONG_TIMEOUT_MS);

      // We track pong via message handling in the gateway, not here
      // Just send ping
      entry.ws.send(JSON.stringify({ type: 'ping' }));

      // Clean up timeout when pong is received (handled externally by calling resetPingTimeout)
      (entry as ConnectedBridge & { _pongTimeout?: ReturnType<typeof setTimeout> })._pongTimeout = pongTimeout;
    }, PING_INTERVAL_MS);
  }

  /** Called when a pong is received to clear the timeout */
  handlePong(bridgeId: string): void {
    const entry = this.connections.get(bridgeId) as (ConnectedBridge & { _pongTimeout?: ReturnType<typeof setTimeout> }) | undefined;
    if (entry?._pongTimeout) {
      clearTimeout(entry._pongTimeout);
      delete entry._pongTimeout;
    }
  }

  private clearPing(entry: ConnectedBridge): void {
    if (entry.pingTimer) {
      clearInterval(entry.pingTimer);
      entry.pingTimer = null;
    }
    const ext = entry as ConnectedBridge & { _pongTimeout?: ReturnType<typeof setTimeout> };
    if (ext._pongTimeout) {
      clearTimeout(ext._pongTimeout);
      delete ext._pongTimeout;
    }
  }
}
