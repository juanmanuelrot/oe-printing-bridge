import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from './jwt.js';
import { hashApiKey } from './passwords.js';
import { db } from '../db/client.js';
import { apiKeys, apiKeyGroups } from '../db/schema.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string };
    apiKey?: { id: string; userId: string; groupIds: string[] };
  }
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);

  // Skip API keys (they start with pk_)
  if (token.startsWith('pk_')) {
    reply.code(401).send({ error: 'Expected JWT token, got API key' });
    return;
  }

  try {
    const payload = verifyToken(token);
    request.user = { id: payload.sub, email: payload.email };
  } catch {
    reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const key = header.slice(7);
  if (!key.startsWith('pk_')) {
    reply.code(401).send({ error: 'Invalid API key format' });
    return;
  }

  const keyHash = hashApiKey(key);
  const prefix = key.slice(0, 8);

  const [found] = await db.select()
    .from(apiKeys)
    .where(and(
      eq(apiKeys.keyPrefix, prefix),
      eq(apiKeys.keyHash, keyHash),
      eq(apiKeys.isActive, true),
    ))
    .limit(1);

  if (!found) {
    reply.code(401).send({ error: 'Invalid API key' });
    return;
  }

  const groupRows = await db.select({ groupId: apiKeyGroups.groupId })
    .from(apiKeyGroups)
    .where(eq(apiKeyGroups.apiKeyId, found.id));

  request.apiKey = {
    id: found.id,
    userId: found.userId,
    groupIds: groupRows.map((r) => r.groupId),
  };
}
