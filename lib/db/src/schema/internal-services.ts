import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const internalCapabilityService = pgTable("internal_capability_service", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: varchar("service_id", { length: 40 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }),
  apiVersion: varchar("api_version", { length: 24 }).notNull().default("v1"),
  healthEndpoint: varchar("health_endpoint", { length: 240 }).notNull(),
  currentHealth: varchar("current_health", { length: 24 }).notNull().default("unavailable"),
  lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
  lastCallAt: timestamp("last_call_at", { withTimezone: true }),
  failurePolicy: varchar("failure_policy", { length: 40 }).notNull(),
  credentialEnvKey: varchar("credential_env_key", { length: 120 }).notNull(),
  metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("internal_service_health_idx").on(table.currentHealth, table.category)]);