import type { FastifyInstance } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { apiKeys, apiKeyGroups, groups } from '../db/schema.js';
import { hashApiKey } from '../auth/passwords.js';
import { requireUser } from '../auth/middleware.js';

export async function apiKeyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireUser);

  // Create API key
  app.post<{
    Body: { name: string; groupIds: string[] };
  }>('/api-keys', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'groupIds'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          groupIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.id;
    const { name, groupIds } = request.body;

    // Verify all groups belong to this user
    const userGroups = await db.select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), inArray(groups.id, groupIds)));

    if (userGroups.length !== groupIds.length) {
      reply.code(400);
      return { error: 'One or more groups not found or not owned by you' };
    }

    const key = `pk_${nanoid(32)}`;
    const keyHash = hashApiKey(key);
    const keyPrefix = key.slice(0, 8);

    const [apiKey] = await db.insert(apiKeys).values({
      userId,
      name,
      keyPrefix,
      keyHash,
    }).returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

    // Link groups
    await db.insert(apiKeyGroups).values(
      groupIds.map((groupId) => ({ apiKeyId: apiKey.id, groupId })),
    );

    reply.code(201);
    return { ...apiKey, key, groupIds };
  });

  // List API keys
  app.get('/api-keys', async (request) => {
    const userId = request.user!.id;

    const keys = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
    })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(apiKeys.createdAt);

    // Load group associations for each key
    const result = await Promise.all(keys.map(async (key) => {
      const keyGroupRows = await db.select({
        groupId: apiKeyGroups.groupId,
        groupName: groups.name,
      })
        .from(apiKeyGroups)
        .innerJoin(groups, eq(apiKeyGroups.groupId, groups.id))
        .where(eq(apiKeyGroups.apiKeyId, key.id));

      return {
        ...key,
        groups: keyGroupRows.map((r) => ({ id: r.groupId, name: r.groupName })),
      };
    }));

    return result;
  });

  // Delete API key
  app.delete<{
    Params: { id: string };
  }>('/api-keys/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const [deleted] = await db.delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning({ id: apiKeys.id });

    if (!deleted) {
      reply.code(404);
      return { error: 'API key not found' };
    }

    reply.code(204);
  });
}
