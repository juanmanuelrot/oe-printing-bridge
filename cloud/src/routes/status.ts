import type { FastifyInstance } from 'fastify';

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async () => {
    return { status: 'ok', service: 'printing-cloud' };
  });
}
