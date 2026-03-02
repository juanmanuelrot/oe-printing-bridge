import type { FastifyInstance } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { printers, printerGroups, bridges, groups } from '../db/schema.js';
import { requireUser } from '../auth/middleware.js';

export async function printerRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  // List printers (optionally filtered by bridgeId or groupId)
  app.get<{
    Querystring: { bridgeId?: string; groupId?: string };
  }>('/printers', async (request, reply) => {
    const userId = request.user!.id;
    const { bridgeId, groupId } = request.query;

    // Get all bridge IDs owned by this user
    const userBridges = await db.select({ id: bridges.id })
      .from(bridges)
      .where(eq(bridges.userId, userId));
    const userBridgeIds = userBridges.map((b) => b.id);

    if (userBridgeIds.length === 0) return [];

    if (bridgeId) {
      if (!userBridgeIds.includes(bridgeId)) {
        reply.code(403);
        return { error: 'Bridge not found or not owned by you' };
      }
      return db.select().from(printers).where(eq(printers.bridgeId, bridgeId));
    }

    if (groupId) {
      // Verify the group belongs to the user
      const [group] = await db.select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
        .limit(1);

      if (!group) {
        reply.code(404);
        return { error: 'Group not found' };
      }

      return db.select({
        id: printers.id,
        bridgeId: printers.bridgeId,
        localPrinterId: printers.localPrinterId,
        name: printers.name,
        address: printers.address,
        status: printers.status,
        createdAt: printers.createdAt,
      })
        .from(printerGroups)
        .innerJoin(printers, eq(printerGroups.printerId, printers.id))
        .where(eq(printerGroups.groupId, groupId));
    }

    // All printers from user's bridges
    return db.select().from(printers).where(inArray(printers.bridgeId, userBridgeIds));
  });

  // Assign printer to group
  app.post<{
    Params: { id: string };
    Body: { groupId: string };
  }>('/printers/:id/groups', {
    schema: {
      body: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.id;
    const printerId = request.params.id;
    const { groupId } = request.body;

    // Verify printer belongs to user's bridge
    const [printer] = await db.select({ id: printers.id, bridgeId: printers.bridgeId })
      .from(printers)
      .innerJoin(bridges, eq(printers.bridgeId, bridges.id))
      .where(and(eq(printers.id, printerId), eq(bridges.userId, userId)))
      .limit(1);

    if (!printer) {
      reply.code(404);
      return { error: 'Printer not found' };
    }

    // Verify group belongs to user
    const [group] = await db.select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
      .limit(1);

    if (!group) {
      reply.code(404);
      return { error: 'Group not found' };
    }

    // Upsert (ignore conflict)
    await db.insert(printerGroups)
      .values({ printerId, groupId })
      .onConflictDoNothing();

    reply.code(201);
    return { printerId, groupId };
  });

  // Remove printer from group
  app.delete<{
    Params: { id: string; groupId: string };
  }>('/printers/:id/groups/:groupId', async (request, reply) => {
    const userId = request.user!.id;
    const { id: printerId, groupId } = request.params;

    // Verify ownership
    const [printer] = await db.select({ id: printers.id })
      .from(printers)
      .innerJoin(bridges, eq(printers.bridgeId, bridges.id))
      .where(and(eq(printers.id, printerId), eq(bridges.userId, userId)))
      .limit(1);

    if (!printer) {
      reply.code(404);
      return { error: 'Printer not found' };
    }

    await db.delete(printerGroups)
      .where(and(
        eq(printerGroups.printerId, printerId),
        eq(printerGroups.groupId, groupId),
      ));

    reply.code(204);
  });
}
