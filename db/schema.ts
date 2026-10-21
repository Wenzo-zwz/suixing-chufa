import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const travelClients = sqliteTable('travel_clients', {
  clientId: text('client_id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
});

export const travelRooms = sqliteTable('travel_rooms', {
  code: text('code').primaryKey(),
  revision: integer('revision').notNull(),
  record: text('record').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
