import { Hono } from 'hono';
import { handle } from 'hono/netlify';
import { cors } from 'hono/cors';
import { db } from '../../server/db';
import { favorites } from '../../server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();

// Middleware
app.use('/*', cors());

// Routes
app.get('/api/favorites', async (c) => {
    try {
        const allFavorites = await db.select().from(favorites).orderBy(desc(favorites.createdAt));
        return c.json(allFavorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return c.json({ error: 'Failed to fetch favorites' }, 500);
    }
});

app.post('/api/favorites', async (c) => {
    try {
        const body = await c.req.json();
        const { label, content, type } = body;

        if (!label) {
            return c.json({ error: 'Label is required' }, 400);
        }

        // Check if already exists
        const existing = await db.select().from(favorites).where(eq(favorites.label, label)).limit(1);
        if (existing.length > 0) {
            return c.json(existing[0]); // Return existing if found
        }

        const newFavorite = {
            id: uuidv4(),
            label,
            content,
            type: type || 'text',
        };

        await db.insert(favorites).values(newFavorite);
        return c.json(newFavorite, 201);
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to add favorite' }, 500);
    }
});

app.delete('/api/favorites/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await db.delete(favorites).where(eq(favorites.id, id));
        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: 'Failed to delete favorite' }, 500);
    }
});

app.get('/api/favorites/check/:label', async (c) => {
    try {
        const label = c.req.param('label');
        const existing = await db.select().from(favorites).where(eq(favorites.label, label)).limit(1);
        return c.json({ isFavorite: existing.length > 0, favorite: existing[0] || null });
    } catch (error) {
        return c.json({ error: 'Failed to check favorite' }, 500);
    }
});

export const handler = handle(app);
