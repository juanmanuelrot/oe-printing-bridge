import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { WsEvent } from '../types.js';

export async function wsRoutes(app: FastifyInstance): Promise<void> {
  const clients = new Set<WebSocket>();

  function broadcast(event: WsEvent): void {
    const message = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    }
  }

  // Subscribe to print queue events
  app.printQueue.on('job:queued', (job) => {
    broadcast({ type: 'job:queued', job });
  });
  app.printQueue.on('job:started', (job) => {
    broadcast({ type: 'job:started', jobId: job.id });
  });
  app.printQueue.on('job:completed', (job) => {
    broadcast({ type: 'job:completed', jobId: job.id });
  });
  app.printQueue.on('job:failed', (job) => {
    broadcast({ type: 'job:failed', jobId: job.id, error: job.error ?? 'Unknown error' });
  });
  app.printQueue.on('job:retry', (info) => {
    broadcast({ type: 'job:retry', jobId: info.jobId, attempt: info.attempt, error: info.error });
  });

  // Subscribe to printer watcher events
  app.printerWatcher.on('printer:status', (info) => {
    broadcast({ type: 'printer:status', printerId: info.printerId, status: info.status });
  });
  app.printerWatcher.on('printer:missing', (info) => {
    broadcast({ type: 'printer:missing', printerId: info.printerId, printerName: info.printerName });
  });

  // WebSocket endpoint
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: 'bridge:status', status: 'ready' } satisfies WsEvent));

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });
}
