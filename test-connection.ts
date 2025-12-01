import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('Testing connection to:', url);
console.log('Token length:', authToken?.length);
console.log('Token start:', authToken?.substring(0, 10));

const client = createClient({
    url: url!,
    authToken: authToken!,
});

async function test() {
    try {
        const result = await client.execute('SELECT 1');
        console.log('Connection successful!', result);
    } catch (e) {
        console.error('Connection failed:', e);
    }
}

test();
