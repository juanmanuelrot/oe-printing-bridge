import type { FastifyInstance } from 'fastify';

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { limit?: number };
  }>('/jobs/recent', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request) => {
    const limit = request.query.limit ?? 20;
    return app.printQueue.getRecentJobs(limit);
  });
}
