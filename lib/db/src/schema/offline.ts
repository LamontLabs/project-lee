import { index, integer, jsonb, pgTable, bigint, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const providerFreshness = pgTable(
  "provider_freshness",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: varchar("provider_id", { length: 80 }).notNull().unique(),
    state: varchar("state", { length: 24 }).notNull().default("unverified"),
    lastSuccessfulRefreshAt: timestamp("last_successful_refresh_at", { withTimezone: true }),
    lastAttemptedRefreshAt: timestamp("last_attempted_refresh_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    evidenceAgeMs: bigint("evidence_age_ms", { mode: "number" }),
    failureCount: integer("failure_count").notNull().default(0),
    activePeriodStartedAt: timestamp("active_period_started_at", { withTimezone: true }),
    lastReconnectedAt: timestamp("last_reconnected_at", { withTimezone: true }),
    limitations: jsonb("limitations").$type<string[]>().notNull().default([]),
    lastEvidence: jsonb("last_evidence").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("provider_freshness_state_idx").on(table.state)],
);

export const providerFreshnessPeriod = pgTable(
  "provider_freshness_period",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: varchar("provider_id", { length: 80 }).notNull(),
    state: varchar("state", { length: 24 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    lastSuccessfulRefreshAt: timestamp("last_successful_refresh_at", { withTimezone: true }),
    evidenceAgeMs: bigint("evidence_age_ms", { mode: "number" }),
    limitations: jsonb("limitations").$type<string[]>().notNull().default([]),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("provider_freshness_period_provider_idx").on(table.providerId, table.startedAt)],
);