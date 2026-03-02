import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { env } from '../env.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.bcryptRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashBridgeToken(token: string): Promise<string> {
  return bcrypt.hash(token, env.bcryptRounds);
}

export async function verifyBridgeToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/** SHA-256 hash for API keys (fast lookup by hash) */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
