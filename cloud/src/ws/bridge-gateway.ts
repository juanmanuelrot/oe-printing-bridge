import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { bridges } from '../db/schema.js';
import { verifyBridgeToken } from '../auth/passwords.js';
import type { BridgeToCloudMessage } from './protocol.js';

const AUTH_TIMEOUT_MS = 10_000;

export async function bridgeGateway(app: FastifyInstance): Promise<void> {
  app.get('/ws/bridge', { websocket: true }, (socket: WebSocket) => {
    let authenticated = false;
    let bridgeId: string | null = null;

    // Auth timeout: disconnect if no auth message within 10s
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        socket.send(JSON.stringify({ type: 'auth:error', error: 'Auth timeout' }));
        socket.close();
      }
    }, AUTH_TIMEOUT_MS);

    socket.on('message', (raw: Buffer) => {
      let message: BridgeToCloudMessage;
      try {
        message = JSON.parse(raw.toString()) as BridgeToCloudMessage;
      } catch {
        return;
      }

      if (!authenticated) {
        if (message.type === 'auth') {
          void handleAuth(message.token);
        }
        return;
      }

      // Authenticated message handling
      switch (message.type) {
        case 'printers:report':
          void app.printerSync.syncPrinters(bridgeId!, message.printers);
          break;

        case 'printer:status':
          void app.printerSync.updateStatus(bridgeId!, message.localPrinterId, message.status);
          break;

        case 'job:received':
          void app.jobRouter.updateJobStatus(message.jobId, 'sent_to_bridge');
          break;

        case 'job:started':
          void app.jobRouter.updateJobStatus(message.jobId, 'printing');
          break;

        case 'job:completed':
          void app.jobRouter.updateJobStatus(message.jobId, 'completed');
          break;

        case 'job:failed':
          void app.jobRouter.updateJobStatus(message.jobId, 'failed', message.error);
          break;

        case 'pong':
          app.bridgeRegistry.handlePong(bridgeId!);
          break;
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
      if (bridgeId) {
        app.bridgeRegistry.unregister(bridgeId);
        void db.update(bridges)
          .set({ isOnline: false })
          .where(eq(bridges.id, bridgeId));
        app.log.info(`Bridge ${bridgeId} disconnected`);
      }
    });

    async function handleAuth(token: string): Promise<void> {
      clearTimeout(authTimeout);

      if (!token.startsWith('brg_')) {
        socket.send(JSON.stringify({ type: 'auth:error', error: 'Invalid token format' }));
        socket.close();
        return;
      }

      const prefix = token.slice(0, 8);

      // Find bridges with matching prefix
      const candidates = await db.select()
        .from(bridges)
        .where(eq(bridges.tokenPrefix, prefix));

      let matchedBridge: typeof candidates[0] | null = null;
      for (const candidate of candidates) {
        if (await verifyBridgeToken(token, candidate.tokenHash)) {
          matchedBridge = candidate;
          break;
        }
      }

      if (!matchedBridge) {
        socket.send(JSON.stringify({ type: 'auth:error', error: 'Invalid bridge token' }));
        socket.close();
        return;
      }

      authenticated = true;
      bridgeId = matchedBridge.id;

      // Update bridge status
      await db.update(bridges)
        .set({ isOnline: true, lastSeenAt: new Date() })
        .where(eq(bridges.id, bridgeId));

      // Register in memory
      app.bridgeRegistry.register(bridgeId, matchedBridge.userId, socket);

      socket.send(JSON.stringify({ type: 'auth:ok', bridgeId }));
      app.log.info(`Bridge ${bridgeId} (${matchedBridge.name}) authenticated`);

      // Sweep pending jobs for this bridge
      void app.jobRouter.sweepPendingJobs();
    }
  });
}
