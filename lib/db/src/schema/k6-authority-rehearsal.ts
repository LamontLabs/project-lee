import { index, jsonb, pgTable, text, timestamp, uuid, varchar, boolean } from "drizzle-orm/pg-core";

export type K6AuthorityRehearsalStatus = "passed" | "failed" | "interrupted" | "reversed" | "incomplete";

export const k6AuthorityRehearsal = pgTable("k6_authority_rehearsal", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: varchar("status", { length: 24 }).notNull().default("incomplete"),
  simulationOnly: boolean("simulation_only").notNull().default(true),
  ownerApproved: boolean("owner_approved").notNull().default(false),
  rollbackCriteria: jsonb("rollback_criteria").$type<string[]>().notNull().default([]),
  backupId: varchar("backup_id", { length: 160 }),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("k6_authority_rehearsal_status_idx").on(table.status, table.updatedAt),
  index("k6_authority_rehearsal_created_idx").on(table.createdAt),
]);