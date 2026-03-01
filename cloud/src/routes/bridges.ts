import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { bridges, printers } from '../db/schema.js';
import { hashBridgeToken } from '../auth/passwords.js';
import { requireUser } from '../auth/middleware.js';

export async function bridgeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  // Create bridge (returns one-time token)
  app.post<{
    Body: { name: string };
  }>('/bridges', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.id;
    const { name } = request.body;

    const token = `brg_${nanoid(48)}`;
    const tokenHash = await hashBridgeToken(token);
    const tokenPrefix = token.slice(0, 8);

    const [bridge] = await db.insert(bridges).values({
      userId,
      name,
      tokenHash,
      tokenPrefix,
    }).returning({
      id: bridges.id,
      name: bridges.name,
      isOnline: bridges.isOnline,
      createdAt: bridges.createdAt,
    });

    reply.code(201);
    return { ...bridge, token };
  });

  // List bridges
  app.get('/bridges', async (request) => {
    const userId = request.user!.id;

    const rows = await db.select({
      id: bridges.id,
      name: bridges.name,
      tokenPrefix: bridges.tokenPrefix,
      isOnline: bridges.isOnline,
      lastSeenAt: bridges.lastSeenAt,
      createdAt: bridges.createdAt,
    })
      .from(bridges)
      .where(eq(bridges.userId, userId))
      .orderBy(bridges.createdAt);

    return rows;
  });

  // Get bridge with printers
  app.get<{
    Params: { id: string };
  }>('/bridges/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const [bridge] = await db.select({
      id: bridges.id,
      name: bridges.name,
      tokenPrefix: bridges.tokenPrefix,
      isOnline: bridges.isOnline,
      lastSeenAt: bridges.lastSeenAt,
      createdAt: bridges.createdAt,
    })
      .from(bridges)
      .where(and(eq(bridges.id, id), eq(bridges.userId, userId)))
      .limit(1);

    if (!bridge) {
      reply.code(404);
      return { error: 'Bridge not found' };
    }

    const bridgePrinters = await db.select()
      .from(printers)
      .where(eq(printers.bridgeId, id));

    return { ...bridge, printers: bridgePrinters };
  });

  // Delete bridge
  app.delete<{
    Params: { id: string };
  }>('/bridges/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const [deleted] = await db.delete(bridges)
      .where(and(eq(bridges.id, id), eq(bridges.userId, userId)))
      .returning({ id: bridges.id });

    if (!deleted) {
      reply.code(404);
      return { error: 'Bridge not found' };
    }

    reply.code(204);
  });
}
