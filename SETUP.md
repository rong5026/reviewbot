# ReviewBot — Deployment Setup Guide

This guide covers the two manual setup tasks needed to go live:
- **CMPAA-6**: Register GitHub App + configure webhook secrets
- **CMPAA-7**: Provision Neon DB + Stripe + deploy to Fly.io

---

## Prerequisites

- GitHub account (for the GitHub App)
- [Neon](https://neon.tech) account (free tier works)
- [Stripe](https://stripe.com) account
- [Fly.io](https://fly.io) account
- [Vercel](https://vercel.com) account (for the Next.js frontend)
- `flyctl` CLI: `curl -L https://fly.io/install.sh | sh`

---

## CMPAA-6: Register GitHub App

### 1. Create the GitHub App

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App**
2. Fill in:
   - **App name**: `ReviewBot` (or `ReviewBot-yourname` if taken)
   - **Homepage URL**: your `APP_URL` (e.g. your Vercel URL)
   - **Webhook URL**: `https://<your-fly-app>.fly.dev/webhooks/github`
   - **Webhook secret**: generate — `openssl rand -hex 32`
3. **Permissions** (Repository):
   - Pull requests: **Read & Write**
   - Contents: **Read**
4. **Subscribe to events**: `Pull request`, `Installation`
5. **Where can this GitHub App be installed?** → Any account
6. Click **Create GitHub App**

### 2. Generate private key

1. On the app page → **Private keys** → **Generate a private key**
2. Download the `.pem` file
3. Base64-encode it:
   ```bash
   base64 -i your-app.private-key.pem | tr -d '\n'
   ```

### 3. Collect these values

| Variable | Where to find it |
|---|---|
| `GITHUB_APP_ID` | App settings page, top |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded PEM from step 2 |
| `GITHUB_WEBHOOK_SECRET` | The random string you generated |
| `GITHUB_CLIENT_ID` | App settings page, OAuth section |
| `GITHUB_CLIENT_SECRET` | App settings → Generate a client secret |

---

## CMPAA-7: Provision Services + Deploy

### 1. Neon Database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Run the DB migration:
   ```bash
   cd packages/db
   bun install
   DATABASE_URL=<connection-string> bun run drizzle-kit push
   ```

### 2. Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create two recurring products:
   - **Pro**: $15/developer/month
   - **Team**: $12/seat/month (min 5)
3. Note the **Price IDs** (start with `price_`)
4. Enable **Customer Portal** in Stripe settings
5. Add a webhook endpoint: `https://<your-fly-app>.fly.dev/api/billing/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Note the **Webhook signing secret** (`whsec_...`)

### 3. Generate secrets

```bash
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 32   # NEXTAUTH_SECRET
```

### 4. Deploy API to Fly.io

```bash
fly auth login
cd apps/api
fly launch --name reviewbot-api --region sin --no-deploy

# Set all secrets at once
fly secrets set \
  GITHUB_APP_ID=<value> \
  GITHUB_APP_PRIVATE_KEY=<base64-pem> \
  GITHUB_WEBHOOK_SECRET=<value> \
  GITHUB_CLIENT_ID=<value> \
  GITHUB_CLIENT_SECRET=<value> \
  ANTHROPIC_API_KEY=<value> \
  DATABASE_URL=<neon-connection-string> \
  STRIPE_SECRET_KEY=<value> \
  STRIPE_WEBHOOK_SECRET=<whsec_value> \
  STRIPE_PRO_PRICE_ID=<price_value> \
  STRIPE_TEAM_PRICE_ID=<price_value> \
  APP_URL=<your-vercel-url> \
  SESSION_SECRET=<random> \
  PORT=3001

fly deploy --remote-only
# Note the URL: https://reviewbot-api.fly.dev
```

### 5. Deploy frontend to Vercel

```bash
npx vercel --cwd apps/web
```

Set these env vars in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://reviewbot-api.fly.dev` |
| `NEXTAUTH_URL` | Your Vercel deployment URL |
| `NEXTAUTH_SECRET` | From step 3 |
| `GITHUB_CLIENT_ID` | From CMPAA-6 |
| `GITHUB_CLIENT_SECRET` | From CMPAA-6 |

### 6. Update GitHub App webhook URL

Go back to GitHub App settings → update **Webhook URL** to:
```
https://reviewbot-api.fly.dev/webhooks/github
```

### 7. Add CI/CD workflows (manual — requires workflow scope)

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run tsc --noEmit
        working-directory: apps/api
      - run: bun run tsc --noEmit
        working-directory: apps/web
```

Create `.github/workflows/deploy-api.yml`:
```yaml
name: Deploy API
on:
  push:
    branches: [main]
    paths: [apps/api/**, packages/db/**]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: apps/api
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Get the deploy token with `fly tokens create deploy` and add it as `FLY_API_TOKEN` in:
Repo → Settings → Secrets and variables → Actions → New repository secret

---

## Verification

```bash
# Health check
curl https://reviewbot-api.fly.dev/health

# Install the GitHub App on a test repo, open a PR
# ReviewBot should comment within 60 seconds
```

---

**Estimated setup time: 30–45 minutes.**
Once complete, mark CMPAA-6 and CMPAA-7 as done.
