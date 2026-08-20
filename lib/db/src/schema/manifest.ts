import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const manifestSnapshot = pgTable("manifest_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  manifestVersion: varchar("manifest_version", { length: 32 }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
  markdown: text("markdown").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});