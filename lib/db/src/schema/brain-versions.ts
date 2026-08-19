import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const brainVersion = pgTable(
  "brain_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    versionName: varchar("version_name", { length: 160 }).notNull(),
    schemaVersion: varchar("schema_version", { length: 32 }).notNull().default("1"),
    status: varchar("status", { length: 32 }).notNull().default("verified"),
    checksum: varchar("checksum", { length: 128 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    recordCounts: jsonb("record_counts").$type<Record<string, number>>().notNull(),
    totalRecords: integer("total_records").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    index("brain_version_created_idx").on(table.createdAt),
    index("brain_version_status_idx").on(table.status),
  ],
);

export const insertBrainVersionSchema = createInsertSchema(brainVersion, {
  payload: jsonRecord,
  recordCounts: jsonRecord,
});