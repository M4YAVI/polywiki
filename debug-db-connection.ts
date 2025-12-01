import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL ? process.env.DATABASE_URL : 'file:local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('DEBUG: DATABASE_URL is set:', !!process.env.DATABASE_URL);
console.log('DEBUG: Connecting to:', url);
if (authToken) {
    console.log('DEBUG: Auth token is present');
} else {
    console.log('DEBUG: Auth token is MISSING');
}

try {
    const client = createClient({
        url,
        authToken,
    });

    await client.execute('SELECT * FROM favorites LIMIT 1');
    console.log('DEBUG: Table "favorites" exists and is accessible!');
} catch (e) {
    console.error('DEBUG: Connection failed:', e);
}
