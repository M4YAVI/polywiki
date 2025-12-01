import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL ? process.env.DATABASE_URL : 'file:local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('Database URL:', url);

const client = createClient({
    url,
    authToken,
});

export const db = drizzle(client, { schema });
