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

export const connector = pgTable(
  "connector",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: varchar("provider", { length: 64 }).notNull().unique(),
    accessMode: varchar("access_mode", { length: 16 }).notNull().default("read"),
    status: varchar("status", { length: 32 }).notNull().default("unconfigured"),
    authStatus: varchar("auth_status", { length: 32 }).notNull().default("not_connected"),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    consecutiveFailureCount: integer("consecutive_failure_count").notNull().default(0),
    eventCount: integer("event_count").notNull().default(0),
    errorHistory: jsonb("error_history").$type<Record<string, unknown>[]>().notNull().default([]),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("connector_status_idx").on(table.status)],
);

export const connection = pgTable(
  "connection",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    method: varchar("method", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    authStatus: varchar("auth_status", { length: 32 }).notNull().default("not_connected"),
    baseUrl: varchar("base_url", { length: 500 }),
    healthEndpoint: varchar("health_endpoint", { length: 240 }),
    credentialRef: varchar("credential_ref", { length: 160 }),
    contractVersion: varchar("contract_version", { length: 32 }),
    permissions: jsonb("permissions").$type<string[]>().notNull().default(["OBSERVE"]),
    capabilities: jsonb("capabilities").$type<Record<string, unknown>[]>().notNull().default([]),
    dependencies: jsonb("dependencies").$type<Record<string, unknown>[]>().notNull().default([]),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("connection_status_idx").on(table.status), index("connection_method_idx").on(table.method)],
);

export const oauthCredential = pgTable(
  "oauth_credential",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectionId: uuid("connection_id").notNull().unique(),
    provider: varchar("provider", { length: 64 }).notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("oauth_credential_connection_idx").on(table.connectionId)],
);

export const androidPairingToken = pgTable(
  "android_pairing_token",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("android_pairing_token_status_idx").on(table.status)],
);

export const connectorSync = pgTable(
  "connector_sync",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectorId: uuid("connector_id").notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    receivedCount: integer("received_count").notNull().default(0),
    normalizedCount: integer("normalized_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("connector_sync_provider_idx").on(table.provider, table.startedAt)],
);

export const normalizedConnectorEvent = pgTable(
  "normalized_connector_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    syncId: uuid("sync_id").notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    externalId: text("external_id").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    sourceRef: text("source_ref").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("normalized_connector_event_sync_idx").on(table.syncId),
    index("normalized_connector_event_external_idx").on(
      table.provider,
      table.externalId,
    ),
  ],
);

export const insertConnectorSchema = createInsertSchema(connector, {
  provider: z.string().min(1),
  scopes: z.array(z.string()),
  errorHistory: z.array(jsonRecord),
  configuration: jsonRecord,
});
export const insertConnectorSyncSchema = createInsertSchema(connectorSync);
export const insertNormalizedConnectorEventSchema = createInsertSchema(
  normalizedConnectorEvent,
  { payload: jsonRecord },
);