import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const understandingRun = pgTable(
  "understanding_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: varchar("source_type", { length: 64 }).notNull(),
    sourceRef: text("source_ref").notNull(),
    sourceReliability: varchar("source_reliability", { length: 16 })
      .notNull()
      .default("medium"),
    rawContent: text("raw_content").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("completed"),
    factCount: integer("fact_count").notNull().default(0),
    interpretationCount: integer("interpretation_count").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("understanding_run_source_idx").on(table.sourceRef),
    index("understanding_run_status_idx").on(table.status, table.startedAt),
  ],
);

export const provenanceRecord = pgTable(
  "provenance_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull(),
    recordType: varchar("record_type", { length: 32 }).notNull(),
    recordId: uuid("record_id").notNull(),
    sourceRef: text("source_ref").notNull(),
    excerpt: text("excerpt"),
    confidence: real("confidence").notNull().default(0.5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("provenance_run_idx").on(table.runId),
    index("provenance_record_idx").on(table.recordType, table.recordId),
  ],
);

export const insertUnderstandingRunSchema = createInsertSchema(
  understandingRun,
  { metadata: jsonRecord },
);
export const insertProvenanceRecordSchema = createInsertSchema(provenanceRecord);

export type UnderstandingRun = typeof understandingRun.$inferSelect;
export type ProvenanceRecord = typeof provenanceRecord.$inferSelect;