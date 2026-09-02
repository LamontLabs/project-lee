import { jsonb, pgTable, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const portfolioState = pgTable("portfolio_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  healthScore: real("health_score").notNull(),
  projectCount: real("project_count").notNull(),
  momentumDistribution: jsonb("momentum_distribution").$type<Record<string, number>>().notNull().default({}),
  sharedDependencies: jsonb("shared_dependencies").$type<Array<{ dependency: string; projectIds: string[] }>>().notNull().default([]),
  attentionDistribution: jsonb("attention_distribution").$type<Array<{ projectId: string; share: number }>>().notNull().default([]),
  crossProjectPeople: jsonb("cross_project_people").$type<Array<{ personId: string; name: string; projectIds: string[] }>>().notNull().default([]),
  alerts: jsonb("alerts").$type<Array<{ type: string; title: string; detail: string; projectIds: string[]; evidenceRefs: string[] }>>().notNull().default([]),
  portfolioAnchors: jsonb("portfolio_anchors").$type<Array<{ id: string; type: string; summary: string }>>().notNull().default([]),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});
export const portfolioStateHistory = pgTable("portfolio_state_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  stateId: uuid("state_id").notNull(),
  healthScore: real("health_score").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});