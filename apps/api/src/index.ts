import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import webhookRouter from './routes/webhook';
import authRouter from './routes/auth';
import billingRouter from './routes/billing';
import reviewsRouter from './routes/reviews';

const app = new Hono();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.route('/webhooks', webhookRouter);
app.route('/api/auth', authRouter);
app.route('/api/billing', billingRouter);
app.route('/api/reviews', reviewsRouter);

const port = parseInt(process.env.PORT ?? '3001');
console.log(`ReviewBot API listening on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
