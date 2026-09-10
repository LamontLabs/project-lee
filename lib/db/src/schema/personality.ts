import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const personalityMemory = pgTable(
  "personality_memory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileKey: varchar("profile_key", { length: 64 }).notNull().default("primary"),
    version: integer("version").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    sections: jsonb("sections").$type<Record<string, unknown>>().notNull(),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull().default({}),
    sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
    changeReason: text("change_reason").notNull(),
    proposedBy: varchar("proposed_by", { length: 120 }).notNull(),
    reviewedBy: varchar("reviewed_by", { length: 120 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    confirmedByOwner: boolean("confirmed_by_owner").notNull().default(false),
    safetyStatus: varchar("safety_status", { length: 24 }).notNull().default("passed"),
    checksum: varchar("checksum", { length: 128 }).notNull(),
    supersedesId: uuid("supersedes_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("personality_memory_profile_version_unique").on(table.profileKey, table.version),
    index("personality_memory_status_idx").on(table.profileKey, table.status),
  ],
);

export const personalityEvolutionHistory = pgTable(
  "personality_evolution_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personalityId: uuid("personality_id").notNull(),
    fromVersion: integer("from_version"),
    toVersion: integer("to_version").notNull(),
    action: varchar("action", { length: 24 }).notNull(),
    reason: text("reason").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    actor: varchar("actor", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("personality_evolution_history_version_idx").on(table.personalityId, table.toVersion, table.createdAt)],
);