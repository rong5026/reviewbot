import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth';
import { getStripe, createCheckoutSession, createPortalSession } from '../services/stripe';
import { getDb } from '@reviewbot/db';
import { orgs, users } from '@reviewbot/db';
import { eq } from 'drizzle-orm';

const router = new Hono();

// Create Stripe checkout session
router.post('/checkout', requireAuth, async (c) => {
  const session = c.get('session') as { userId: string; orgId: string | null };
  if (!session.orgId) return c.json({ error: 'No org associated' }, 400);

  const { priceId } = await c.req.json<{ priceId: string }>();
  if (!priceId) return c.json({ error: 'priceId required' }, 400);

  const db = getDb();
  const org = await db.query.orgs.findFirst({ where: eq(orgs.id, session.orgId) });
  if (!org) return c.json({ error: 'Org not found' }, 404);

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const url = await createCheckoutSession({
    orgId: org.id,
    priceId,
    successUrl: `${appUrl}/dashboard?billing=success`,
    cancelUrl: `${appUrl}/billing`,
    customerId: org.stripeCustomerId ?? undefined,
  });

  return c.json({ url });
});

// Billing portal (manage subscription)
router.post('/portal', requireAuth, async (c) => {
  const session = c.get('session') as { orgId: string | null };
  if (!session.orgId) return c.json({ error: 'No org associated' }, 400);

  const db = getDb();
  const org = await db.query.orgs.findFirst({ where: eq(orgs.id, session.orgId) });
  if (!org?.stripeCustomerId) return c.json({ error: 'No billing account' }, 404);

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const url = await createPortalSession({
    customerId: org.stripeCustomerId,
    returnUrl: `${appUrl}/dashboard`,
  });
  return c.json({ url });
});

// Stripe webhook handler
router.post('/webhook', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature') ?? '';
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as { metadata: Record<string, string>; customer: string; subscription: string };
      const orgId = session.metadata?.orgId;
      if (!orgId) break;
      await db
        .update(orgs)
        .set({
          planTier: 'pro',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          maxReposAllowed: 9999,
        })
        .where(eq(orgs.id, orgId));
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { customer: string };
      await db
        .update(orgs)
        .set({ planTier: 'free', stripeSubscriptionId: null, maxReposAllowed: 3 })
        .where(eq(orgs.stripeCustomerId, sub.customer));
      break;
    }
  }

  return c.json({ received: true });
});

export default router;
