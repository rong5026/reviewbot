# ReviewBot

AI-powered code review bot for GitHub PRs — powered by Claude.

## Stack

- **Backend:** Node.js (Bun runtime) + [Hono](https://hono.dev)
- **Database:** PostgreSQL via [Neon](https://neon.tech) serverless + [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** GitHub OAuth via NextAuth.js
- **Billing:** [Stripe](https://stripe.com) Subscriptions
- **Deploy:** [Fly.io](https://fly.io)
- **Frontend:** [Next.js 15](https://nextjs.org) + [shadcn/ui](https://ui.shadcn.com)

## Monorepo Layout

```
reviewbot/
├── apps/
│   ├── api/    # Hono webhook + review server
│   └── web/    # Next.js 15 dashboard + landing page
└── packages/
    └── db/     # Drizzle schema + migrations
```

## Quick Start

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Pricing

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 3 repos, 10 reviews/month |
| Pro | $15/dev/month | Unlimited |
| Team | $12/seat/month | 5+ developers |
