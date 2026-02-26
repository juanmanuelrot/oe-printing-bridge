import type { FastifyInstance } from 'fastify';

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async () => {
    return {
      status: 'ok',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      queueLength: app.printQueue.getQueueLength(),
    };
  });
}
