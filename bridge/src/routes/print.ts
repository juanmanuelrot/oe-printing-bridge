import type { FastifyInstance } from 'fastify';

export async function printRoutes(app: FastifyInstance): Promise<void> {
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

    // Validate printer exists
    const printer = app.configManager.getPrinter(printerId);
    if (!printer) {
      reply.code(404);
      return { error: `Printer "${printerId}" not found in configuration` };
    }

    if (!printer.enabled) {
      reply.code(400);
      return { error: `Printer "${printerId}" is disabled` };
    }

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

    const job = app.printQueue.enqueue(printerId, data);

    reply.code(202);
    return {
      jobId: job.id,
      status: job.status,
      queuePosition: app.printQueue.getQueueLength(),
    };
  });
}
