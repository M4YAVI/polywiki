import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const favorites = sqliteTable('favorites', {
    id: text('id').primaryKey(), // We'll use UUIDs
    label: text('label').notNull(),
    content: text('content'), // Optional cached content
    type: text('type').notNull().default('text'), // 'text' or 'image'
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
