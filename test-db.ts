import { createClient } from '@libsql/client';

const url = 'file:local.db';
console.log('Connecting to:', url);

try {
    const client = createClient({
        url,
    });

    await client.execute('SELECT 1');
    console.log('Connection successful!');
} catch (e) {
    console.error('Connection failed:', e);
}
