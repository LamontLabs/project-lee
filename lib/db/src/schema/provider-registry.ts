import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const providerRegistration = pgTable("provider_registration", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: varchar("provider_id", { length: 80 }).notNull().unique(),
  providerCategory: varchar("provider_category", { length: 32 }).notNull(),
  adapterName: varchar("adapter_name", { length: 120 }).notNull(),
  currentStatus: varchar("current_status", { length: 24 }).notNull().default("HEALTHY"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  supportedEvents: jsonb("supported_events").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("provider_registration_category_idx").on(table.providerCategory, table.currentStatus)]);