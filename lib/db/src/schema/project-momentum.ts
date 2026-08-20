import { integer, jsonb, pgTable, real, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
export const projectMomentum = pgTable("project_momentum", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  score: integer("score").notNull(),
  classification: varchar("classification", { length: 24 }).notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  contributions: jsonb("contributions").$type<Array<{ key: string; label: string; count: number; weight: number; contribution: number }>>().notNull().default([]),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});
export const projectMomentumHistory = pgTable("project_momentum_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  score: integer("score").notNull(),
  classification: varchar("classification", { length: 24 }).notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  contributions: jsonb("contributions").$type<Array<{ key: string; label: string; count: number; weight: number; contribution: number }>>().notNull().default([]),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});