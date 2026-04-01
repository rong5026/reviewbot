import { Hono } from 'hono';
import { getOAuthToken, getGithubUser } from '../services/github';
import { signSession } from '../lib/session';
import { getDb } from '@reviewbot/db';
import { users, orgs } from '@reviewbot/db';
import { eq } from 'drizzle-orm';

const router = new Hono();

// Step 1: Redirect to GitHub OAuth
router.get('/github', (c) => {
  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.API_URL ?? 'http://localhost:3001'}/api/auth/github/callback`,
    scope: 'read:user user:email read:org',
    state,
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// Step 2: OAuth callback
router.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ error: 'Missing code' }, 400);

  try {
    const { access_token } = await getOAuthToken(code);
    const ghUser = await getGithubUser(access_token);

    const db = getDb();
    const existing = await db.query.users.findFirst({
      where: eq(users.githubUserId, ghUser.id),
    });

    let user;
    if (existing) {
      user = existing;
    } else {
      const [created] = await db
        .insert(users)
        .values({
          githubUserId: ghUser.id,
          githubLogin: ghUser.login,
          email: ghUser.email ?? undefined,
        })
        .returning();
      user = created;
    }

    const token = signSession({
      userId: user.id,
      githubLogin: user.githubLogin,
      orgId: user.orgId,
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return c.redirect(`${appUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Auth error:', err);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return c.redirect(`${appUrl}/auth/error`);
  }
});

router.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const { verifySession } = await import('../lib/session');
  const session = verifySession(token);
  if (!session) return c.json({ error: 'Invalid session' }, 401);

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!user) return c.json({ error: 'User not found' }, 404);

  let org = null;
  if (user.orgId) {
    org = await db.query.orgs.findFirst({ where: eq(orgs.id, user.orgId) });
  }

  return c.json({ user, org });
});

export default router;
