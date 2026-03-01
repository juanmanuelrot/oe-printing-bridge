import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { BridgeRegistry } from './ws/bridge-registry.js';
import { PrinterSync } from './services/printer-sync.js';
import { JobRouter } from './services/job-router.js';
import { authRoutes } from './routes/auth.js';
import { statusRoutes } from './routes/status.js';
import { groupRoutes } from './routes/groups.js';
import { bridgeRoutes } from './routes/bridges.js';
import { printerRoutes } from './routes/printers.js';
import { apiKeyRoutes } from './routes/api-keys.js';
import { printRoutes } from './routes/print.js';
import { jobRoutes } from './routes/jobs.js';
import { bridgeGateway } from './ws/bridge-gateway.js';

declare module 'fastify' {
  interface FastifyInstance {
    bridgeRegistry: BridgeRegistry;
    printerSync: PrinterSync;
    jobRouter: JobRouter;
  }
}

export async function createServer() {
  const app = Fastify({ logger: true });

  // Services
  const bridgeRegistry = new BridgeRegistry();
  const printerSync = new PrinterSync();
  const jobRouter = new JobRouter(bridgeRegistry);

  app.decorate('bridgeRegistry', bridgeRegistry);
  app.decorate('printerSync', printerSync);
  app.decorate('jobRouter', jobRouter);

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // REST routes
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(statusRoutes, { prefix: '/api' });
  await app.register(groupRoutes, { prefix: '/api' });
  await app.register(bridgeRoutes, { prefix: '/api' });
  await app.register(printerRoutes, { prefix: '/api' });
  await app.register(apiKeyRoutes, { prefix: '/api' });
  await app.register(printRoutes, { prefix: '/api' });
  await app.register(jobRoutes, { prefix: '/api' });

  // WebSocket gateway
  await app.register(bridgeGateway);

  return { app, jobRouter };
}
