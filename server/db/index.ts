import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import dotenv from 'dotenv';

// Only load .env.local if we are not in production (or if we want to force it locally)
// In Netlify, env vars are injected directly.
dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

// In production (Netlify), we must have a DATABASE_URL.
// We should not fall back to a local file which doesn't exist/work in lambda.
if (!url && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: DATABASE_URL is not set in production environment.');
}

const finalUrl = url || 'file:local.db';

console.log('Database URL set to:', finalUrl);

let client;
try {
    client = createClient({
        url: finalUrl,
        authToken,
    });
} catch (e) {
    console.error('Failed to create database client:', e);
    throw e;
}

export const db = drizzle(client, { schema });
