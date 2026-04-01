import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
} from 'drizzle-orm/pg-core';

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubInstallationId: integer('github_installation_id').notNull().unique(),
  githubOrgLogin: text('github_org_login').notNull(),
  planTier: text('plan_tier').notNull().default('free'), // 'free' | 'pro' | 'team'
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  reviewsUsedThisMonth: integer('reviews_used_this_month').notNull().default(0),
  reviewsResetAt: timestamp('reviews_reset_at').notNull().defaultNow(),
  maxReposAllowed: integer('max_repos_allowed').notNull().default(3),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const repos = pgTable('repos', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  githubRepoId: integer('github_repo_id').notNull(),
  fullName: text('full_name').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubUserId: integer('github_user_id').notNull().unique(),
  githubLogin: text('github_login').notNull(),
  email: text('email'),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'set null' }),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  repoFullName: text('repo_full_name').notNull(),
  prNumber: integer('pr_number').notNull(),
  prTitle: text('pr_title').notNull(),
  prAuthor: text('pr_author').notNull(),
  githubCommentId: text('github_comment_id'),
  riskLevel: text('risk_level'), // 'low' | 'medium' | 'high' | 'critical'
  summary: text('summary'),
  inlineCommentCount: integer('inline_comment_count').notNull().default(0),
  tokensUsed: integer('tokens_used'),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Org = typeof orgs.$inferSelect;
export type InsertOrg = typeof orgs.$inferInsert;
export type Repo = typeof repos.$inferSelect;
export type User = typeof users.$inferSelect;
export type Review = typeof reviews.$inferSelect;
