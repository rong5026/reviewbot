import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth';
import { getDb } from '@reviewbot/db';
import { reviews, orgs } from '@reviewbot/db';
import { eq, desc } from 'drizzle-orm';

const router = new Hono();

// List reviews for the authenticated org
router.get('/', requireAuth, async (c) => {
  const session = c.get('session') as { orgId: string | null };
  if (!session.orgId) return c.json({ reviews: [] });

  const db = getDb();
  const limit = Math.min(Number(c.req.query('limit') ?? '50'), 200);
  const offset = Number(c.req.query('offset') ?? '0');

  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.orgId, session.orgId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ reviews: rows });
});

// Usage stats for dashboard header
router.get('/stats', requireAuth, async (c) => {
  const session = c.get('session') as { orgId: string | null };
  if (!session.orgId) return c.json({ reviewsThisMonth: 0, limit: 10, planTier: 'free' });

  const db = getDb();
  const org = await db.query.orgs.findFirst({ where: eq(orgs.id, session.orgId) });
  if (!org) return c.json({ reviewsThisMonth: 0, limit: 10, planTier: 'free' });

  return c.json({
    reviewsThisMonth: org.reviewsUsedThisMonth,
    limit: org.planTier === 'free' ? 10 : null,
    planTier: org.planTier,
  });
});

export default router;
