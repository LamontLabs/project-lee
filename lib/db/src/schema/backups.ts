import { jsonb, integer, pgTable, text, timestamp, uuid, varchar, boolean, index } from "drizzle-orm/pg-core";
export const backupArchive = pgTable("backup_archive", {
  id: uuid("id").defaultRandom().primaryKey(),
  backupId: varchar("backup_id", { length: 160 }).notNull().unique(),
  formatVersion: varchar("format_version", { length: 32 }).notNull().default("1"),
  brainVersion: varchar("brain_version", { length: 160 }).notNull(),
  manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  encrypted: boolean("encrypted").notNull().default(false),
  status: varchar("status", { length: 32 }).notNull().default("created"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  restoreTestedAt: timestamp("restore_tested_at", { withTimezone: true }),
  restoreTestStatus: varchar("restore_test_status", { length: 32 }),
  restoreEvidence: jsonb("restore_evidence").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("backup_archive_created_idx").on(table.createdAt)]);