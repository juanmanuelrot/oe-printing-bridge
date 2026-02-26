import type { FastifyInstance } from 'fastify';
import { discoverPrinters } from '../printers/discovery.js';

export async function printerRoutes(app: FastifyInstance): Promise<void> {
  // List all Windows-installed printers with their status
  app.get('/printers/available', async () => {
    const configured = app.configManager.getPrinters();
    return discoverPrinters(configured);
  });

  // List configured printers with live status
  app.get('/printers/configured', async () => {
    return app.printerWatcher.getConfiguredPrintersWithStatus();
  });

  // Add or update a configured printer
  app.post<{
    Body: { id: string; name: string; address: string; enabled?: boolean };
  }>('/printers', {
    schema: {
      body: {
        type: 'object',
        required: ['id', 'name', 'address'],
        properties: {
          id: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1 },
          address: { type: 'string', minLength: 1 },
          enabled: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const { id, name, address, enabled = true } = request.body;
    const printer = app.configManager.addPrinter({ id, name, address, enabled });
    // Trigger an immediate status poll for the new printer
    app.printerWatcher.poll();
    reply.code(201);
    return printer;
  });

  // Remove a configured printer
  app.delete<{ Params: { id: string } }>('/printers/:id', async (request, reply) => {
    const removed = app.configManager.removePrinter(request.params.id);
    if (!removed) {
      reply.code(404);
      return { error: `Printer "${request.params.id}" not found` };
    }
    reply.code(204);
    return;
  });
}
