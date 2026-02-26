import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import type { ConfigManager } from './config/config-manager.js';
import type { PrintQueue } from './print/print-queue.js';
import type { PrinterWatcher } from './printers/watcher.js';
import { statusRoutes } from './routes/status.js';
import { printerRoutes } from './routes/printers.js';
import { printRoutes } from './routes/print.js';
import { jobRoutes } from './routes/jobs.js';
import { wsRoutes } from './routes/ws.js';

declare module 'fastify' {
  interface FastifyInstance {
    configManager: ConfigManager;
    printQueue: PrintQueue;
    printerWatcher: PrinterWatcher;
  }
}

export interface ServerDeps {
  configManager: ConfigManager;
  printQueue: PrintQueue;
  printerWatcher: PrinterWatcher;
}

export async function createServer(deps: ServerDeps) {
  const app = Fastify({
    logger: true,
  });

  // Decorate with shared dependencies
  app.decorate('configManager', deps.configManager);
  app.decorate('printQueue', deps.printQueue);
  app.decorate('printerWatcher', deps.printerWatcher);

  // Register plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Register routes
  await app.register(statusRoutes, { prefix: '/api' });
  await app.register(printerRoutes, { prefix: '/api' });
  await app.register(printRoutes, { prefix: '/api' });
  await app.register(jobRoutes, { prefix: '/api' });
  await app.register(wsRoutes);

  return app;
}
