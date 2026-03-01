import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { groups, printers, printerGroups } from '../db/schema.js';
import { requireUser } from '../auth/middleware.js';

export async function groupRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  // Create group
  app.post<{
    Body: { name: string };
  }>('/groups', {
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

    // Check for duplicate name
    const [existing] = await db.select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), eq(groups.name, name)))
      .limit(1);

    if (existing) {
      reply.code(409);
      return { error: 'A group with this name already exists' };
    }

    const [group] = await db.insert(groups).values({
      userId,
      name,
    }).returning();

    reply.code(201);
    return group;
  });

  // List groups
  app.get('/groups', async (request) => {
    const userId = request.user!.id;

    const rows = await db.select()
      .from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(groups.createdAt);

    return rows;
  });

  // Get group with printers
  app.get<{
    Params: { id: string };
  }>('/groups/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const [group] = await db.select()
      .from(groups)
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))
      .limit(1);

    if (!group) {
      reply.code(404);
      return { error: 'Group not found' };
    }

    const groupPrinters = await db.select({
      id: printers.id,
      bridgeId: printers.bridgeId,
      localPrinterId: printers.localPrinterId,
      name: printers.name,
      address: printers.address,
      status: printers.status,
    })
      .from(printerGroups)
      .innerJoin(printers, eq(printerGroups.printerId, printers.id))
      .where(eq(printerGroups.groupId, id));

    return { ...group, printers: groupPrinters };
  });

  // Update group
  app.patch<{
    Params: { id: string };
    Body: { name: string };
  }>('/groups/:id', {
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
    const { id } = request.params;
    const { name } = request.body;

    const [updated] = await db.update(groups)
      .set({ name })
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))
      .returning();

    if (!updated) {
      reply.code(404);
      return { error: 'Group not found' };
    }

    return updated;
  });

  // Delete group
  app.delete<{
    Params: { id: string };
  }>('/groups/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const [deleted] = await db.delete(groups)
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))
      .returning({ id: groups.id });

    if (!deleted) {
      reply.code(404);
      return { error: 'Group not found' };
    }

    reply.code(204);
  });
}
