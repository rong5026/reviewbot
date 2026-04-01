import type { Context, Next } from 'hono';
import { verifySession } from '../lib/session';

export async function requireAuth(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const session = verifySession(token);
  if (!session) return c.json({ error: 'Invalid session' }, 401);
  c.set('session', session);
  await next();
}
