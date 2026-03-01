import { pgTable, uuid, varchar, boolean, text, timestamp, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Printer Groups ─────────────────────────────────────────────────────────

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('groups_user_id_name_idx').on(table.userId, table.name),
]);

// ── Bridges ────────────────────────────────────────────────────────────────

export const bridges = pgTable('bridges', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  tokenPrefix: varchar('token_prefix', { length: 12 }).notNull(),
  isOnline: boolean('is_online').default(false).notNull(),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Printers (reported by bridges) ─────────────────────────────────────────

export const printers = pgTable('printers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bridgeId: uuid('bridge_id').notNull().references(() => bridges.id, { onDelete: 'cascade' }),
  localPrinterId: varchar('local_printer_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('unknown').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('printers_bridge_id_local_printer_id_idx').on(table.bridgeId, table.localPrinterId),
]);

// ── Printer-Group assignments (many-to-many) ──────────────────────────────

export const printerGroups = pgTable('printer_groups', {
  printerId: uuid('printer_id').notNull().references(() => printers.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.printerId, table.groupId] }),
]);

// ── API Keys ───────────────────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── API Key-Group scopes (many-to-many) ────────────────────────────────────

export const apiKeyGroups = pgTable('api_key_groups', {
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.apiKeyId, table.groupId] }),
]);

// ── Print Jobs ─────────────────────────────────────────────────────────────

export const printJobs = pgTable('print_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  printerId: uuid('printer_id').notNull().references(() => printers.id),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  data: text('data').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
  completedAt: timestamp('completed_at'),
});
