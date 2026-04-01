import Stripe from 'stripe';

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia',
    });
  }
  return _stripe;
}

export const PLAN_LIMITS = {
  free: { reviewsPerMonth: 10, maxRepos: 3 },
  pro: { reviewsPerMonth: Infinity, maxRepos: Infinity },
  team: { reviewsPerMonth: Infinity, maxRepos: Infinity },
} as const;

export async function createCheckoutSession(opts: {
  orgId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: opts.customerId,
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { orgId: opts.orgId },
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error('No checkout URL returned from Stripe');
  return session.url;
}

export async function createPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
  return session.url;
}
