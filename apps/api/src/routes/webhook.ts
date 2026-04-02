import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import { reviewPR } from '../services/review';
import { getInstallationClient } from '../services/github';
import { getDb } from '@reviewbot/db';
import { orgs, repos, reviews } from '@reviewbot/db';
import { eq, and, lt, sql } from 'drizzle-orm';
import type { Org } from '@reviewbot/db';

const router = new Hono();

function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  } catch {
    return false;
  }
}

router.post('/github', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('x-hub-signature-256') ?? '';
  const event = c.req.header('x-github-event') ?? '';

  if (!verifySignature(body, sig, process.env.GITHUB_WEBHOOK_SECRET!)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload = JSON.parse(body) as Record<string, any>;

  if (event === 'installation') {
    if (payload.action === 'created') {
      const db = getDb();
      await db
        .insert(orgs)
        .values({
          githubInstallationId: payload.installation.id,
          githubOrgLogin: payload.installation.account.login,
        })
        .onConflictDoNothing();
    }
    return c.json({ ok: true });
  }

  if (event !== 'pull_request') return c.json({ ok: true });
  if (!['opened', 'synchronize'].includes(payload.action)) return c.json({ ok: true });

  const installationId: number = payload.installation?.id;
  if (!installationId) return c.json({ ok: true });

  const db = getDb();
  const org = await db.query.orgs.findFirst({
    where: eq(orgs.githubInstallationId, installationId),
  });

  if (!org) return c.json({ ok: true });

  // Reset monthly counter if needed
  const now = new Date();
  if (now.getTime() - new Date(org.reviewsResetAt).getTime() > 30 * 24 * 60 * 60 * 1000) {
    await db
      .update(orgs)
      .set({ reviewsUsedThisMonth: 0, reviewsResetAt: now })
      .where(eq(orgs.id, org.id));
    org.reviewsUsedThisMonth = 0;
  }

  // Ensure repo record exists (auto-enable on first PR)
  await db
    .insert(repos)
    .values({
      orgId: org.id,
      githubRepoId: payload.repository.id,
      fullName: payload.repository.full_name,
      isEnabled: true,
    })
    .onConflictDoNothing();

  const repo = await db.query.repos.findFirst({
    where: and(
      eq(repos.orgId, org.id),
      eq(repos.githubRepoId, payload.repository.id),
    ),
  });

  if (repo && !repo.isEnabled) return c.json({ ok: true });

  // Process async — don't block webhook response
  processReview({
    org,
    installationId,
    pr: payload.pull_request,
    repoFullName: payload.repository.full_name,
  }).catch((err: Error) => console.error('Review failed:', err.message));

  return c.json({ ok: true });
});

async function processReview(opts: {
  org: Org;
  installationId: number;
  pr: Record<string, any>;
  repoFullName: string;
}) {
  const { org, installationId, pr, repoFullName } = opts;
  const start = Date.now();
  const db = getDb();
  const [owner, repoName] = repoFullName.split('/');
  const github = await getInstallationClient(installationId);

  // Atomically claim a review slot to prevent race conditions under concurrent PRs.
  // For free orgs: single UPDATE ... WHERE usage < 10 RETURNING — if 0 rows updated,
  // the limit was already reached by a concurrent request.
  if (org.planTier === 'free') {
    const claimed = await db
      .update(orgs)
      .set({ reviewsUsedThisMonth: sql`${orgs.reviewsUsedThisMonth} + 1` })
      .where(and(eq(orgs.id, org.id), lt(orgs.reviewsUsedThisMonth, 10)))
      .returning({ id: orgs.id });

    if (claimed.length === 0) {
      await github.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: pr.number,
        body: [
          '## ReviewBot ⚠️ Free Tier Limit Reached',
          '',
          `You've used all **10 free reviews** this month for **${org.githubOrgLogin}**.`,
          '',
          '[**Upgrade to Pro**](' +
            (process.env.APP_URL ?? 'https://reviewbot.app') +
            '/billing) for unlimited reviews at $15/developer/month.',
        ].join('\n'),
      });
      return;
    }
  } else {
    // Pro/Team: uncapped — just track usage
    await db
      .update(orgs)
      .set({ reviewsUsedThisMonth: sql`${orgs.reviewsUsedThisMonth} + 1` })
      .where(eq(orgs.id, org.id));
  }

  // Fetch PR diff
  const diffResp = await github.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo: repoName,
    pull_number: pr.number,
    headers: { Accept: 'application/vnd.github.diff' },
  });
  const diff = diffResp.data as unknown as string;

  let reviewResult;
  let errorMessage: string | undefined;

  try {
    reviewResult = await reviewPR({
      prTitle: pr.title,
      prDescription: pr.body ?? '',
      diff,
      repoFullName,
      prNumber: pr.number,
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Claude review error:', errorMessage);
  }

  if (!reviewResult) {
    await db.insert(reviews).values({
      orgId: org.id,
      repoFullName,
      prNumber: pr.number,
      prTitle: pr.title,
      prAuthor: pr.user.login,
      errorMessage,
      durationMs: Date.now() - start,
    });
    return;
  }

  const riskEmoji: Record<string, string> = {
    low: '\ud83d\udfe2',
    medium: '\ud83d\udfe1',
    high: '\ud83d\udd34',
    critical: '\ud83d\udc80',
  };
  const emoji = riskEmoji[reviewResult.riskLevel] ?? '\u2139\ufe0f';

  const commentBody = [
    `## ${emoji} ReviewBot — ${reviewResult.riskLevel.toUpperCase()} Risk`,
    '',
    reviewResult.summary,
    '',
    '---',
    `*Powered by [ReviewBot](${process.env.APP_URL ?? 'https://reviewbot.app'}) · [Dashboard](${
      process.env.APP_URL ?? 'https://reviewbot.app'
    }/dashboard)*`,
  ].join('\n');

  const commentResp = await github.rest.issues.createComment({
    owner,
    repo: repoName,
    issue_number: pr.number,
    body: commentBody,
  });

  // Post inline review comments (best-effort — diff positions can go stale)
  if (reviewResult.inlineComments.length > 0) {
    try {
      await github.rest.pulls.createReview({
        owner,
        repo: repoName,
        pull_number: pr.number,
        event: 'COMMENT',
        comments: reviewResult.inlineComments.map((c) => ({
          path: c.path,
          line: c.line,
          body: c.body,
        })),
      });
    } catch (e) {
      console.warn('Inline comments failed (possibly stale diff position):', e);
    }
  }

  // Persist review record
  await db.insert(reviews).values({
    orgId: org.id,
    repoFullName,
    prNumber: pr.number,
    prTitle: pr.title,
    prAuthor: pr.user.login,
    githubCommentId: String(commentResp.data.id),
    riskLevel: reviewResult.riskLevel,
    summary: reviewResult.summary,
    inlineCommentCount: reviewResult.inlineComments.length,
    tokensUsed: reviewResult.tokensUsed,
    durationMs: Date.now() - start,
  });
}

export default router;
