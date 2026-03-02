import type { FastifyInstance } from 'fastify';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { printJobs, printerGroups, bridges, printers, groups } from '../db/schema.js';
import { requireUser, requireApiKey } from '../auth/middleware.js';

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  // Jobs endpoint accepts both JWT and API key auth
  app.addHook('preHandler', async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = header.slice(7);
    if (token.startsWith('pk_')) {
      await requireApiKey(request, reply);
    } else {
      await requireUser(request, reply);
    }
  });

  // List jobs
  app.get<{
    Querystring: { groupId?: string; status?: string; limit?: string };
  }>('/jobs', async (request) => {
    const limit = Math.min(parseInt(request.query.limit ?? '50', 10), 200);
    const { groupId, status } = request.query;

    // Determine accessible group IDs
    let accessibleGroupIds: string[];

    if (request.apiKey) {
      accessibleGroupIds = request.apiKey.groupIds;
    } else {
      // JWT user: get all their groups
      const userGroups = await db.select({ id: groups.id })
        .from(groups)
        .where(eq(groups.userId, request.user!.id));
      accessibleGroupIds = userGroups.map((g) => g.id);
    }

    if (accessibleGroupIds.length === 0) return [];

    // Filter by specific group if requested
    const targetGroupIds = groupId && accessibleGroupIds.includes(groupId)
      ? [groupId]
      : accessibleGroupIds;

    let query = db.select({
      id: printJobs.id,
      printerId: printJobs.printerId,
      groupId: printJobs.groupId,
      status: printJobs.status,
      error: printJobs.error,
      createdAt: printJobs.createdAt,
      sentAt: printJobs.sentAt,
      completedAt: printJobs.completedAt,
    })
      .from(printJobs)
      .where(inArray(printJobs.groupId, targetGroupIds))
      .orderBy(desc(printJobs.createdAt))
      .limit(limit)
      .$dynamic();

    if (status) {
      query = query.where(and(
        inArray(printJobs.groupId, targetGroupIds),
        eq(printJobs.status, status),
      ));
    }

    return query;
  });

  // Get single job
  app.get<{
    Params: { id: string };
  }>('/jobs/:id', async (request, reply) => {
    const { id } = request.params;

    const [job] = await db.select({
      id: printJobs.id,
      printerId: printJobs.printerId,
      groupId: printJobs.groupId,
      status: printJobs.status,
      error: printJobs.error,
      createdAt: printJobs.createdAt,
      sentAt: printJobs.sentAt,
      completedAt: printJobs.completedAt,
    })
      .from(printJobs)
      .where(eq(printJobs.id, id))
      .limit(1);

    if (!job) {
      reply.code(404);
      return { error: 'Job not found' };
    }

    // Verify access
    if (request.apiKey) {
      if (!request.apiKey.groupIds.includes(job.groupId)) {
        reply.code(403);
        return { error: 'Access denied' };
      }
    } else {
      const [group] = await db.select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.id, job.groupId), eq(groups.userId, request.user!.id)))
        .limit(1);
      if (!group) {
        reply.code(403);
        return { error: 'Access denied' };
      }
    }

    return job;
  });
}
