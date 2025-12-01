import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
    schema: './server/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'file:local.db',
        token: process.env.DATABASE_AUTH_TOKEN,
    },
});
