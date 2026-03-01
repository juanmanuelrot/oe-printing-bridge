import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { signToken } from '../auth/jwt.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: { email: string; password: string };
  }>('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    // Check if email already exists
    const [existing] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      reply.code(409);
      return { error: 'Email already registered' };
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
    }).returning({ id: users.id, email: users.email, createdAt: users.createdAt });

    const token = signToken({ sub: user.id, email: user.email });

    reply.code(201);
    return { user: { id: user.id, email: user.email, createdAt: user.createdAt }, token };
  });

  app.post<{
    Body: { email: string; password: string };
  }>('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', maxLength: 255 },
          password: { type: 'string', maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      reply.code(401);
      return { error: 'Invalid email or password' };
    }

    const token = signToken({ sub: user.id, email: user.email });

    return { user: { id: user.id, email: user.email, createdAt: user.createdAt }, token };
  });
}
