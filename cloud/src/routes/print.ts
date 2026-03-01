import type { FastifyInstance } from 'fastify';
import { requireApiKey } from '../auth/middleware.js';
import { JobRouterError } from '../services/job-router.js';

export async function printRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireApiKey);

  app.post<{
    Body: { printerId: string; data: string };
  }>('/print', {
    schema: {
      body: {
        type: 'object',
        required: ['printerId', 'data'],
        properties: {
          printerId: { type: 'string', minLength: 1 },
          data: { type: 'string', minLength: 4 },
        },
      },
    },
  }, async (request, reply) => {
    const { printerId, data } = request.body;
    const apiKey = request.apiKey!;

    // Validate base64
    try {
      const buf = Buffer.from(data, 'base64');
      if (buf.length === 0) {
        reply.code(400);
        return { error: 'Print data is empty after base64 decode' };
      }
    } catch {
      reply.code(400);
      return { error: 'Invalid base64 data' };
    }

    try {
      const job = await app.jobRouter.submitJob({
        printerId,
        data,
        apiKeyId: apiKey.id,
        groupIds: apiKey.groupIds,
      });

      reply.code(202);
      return { jobId: job.id, status: job.status };
    } catch (err) {
      if (err instanceof JobRouterError) {
        reply.code(err.statusCode);
        return { error: err.message };
      }
      throw err;
    }
  });
}
