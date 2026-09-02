import { boolean, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const modeConfig = pgTable("mode_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  modeName: varchar("mode_name", { length: 32 }).notNull().unique(),
  signalWeights: jsonb("signal_weights").$type<Record<string, number>>().notNull().default({}),
  navOrder: jsonb("nav_order").$type<string[]>().notNull().default([]),
  statusBarSlots: jsonb("status_bar_slots").$type<string[]>().notNull().default([]),
  askLeeDefaultMode: varchar("ask_lee_default_mode", { length: 32 }).notNull().default("normal"),
  notificationThreshold: varchar("notification_threshold", { length: 24 }).notNull().default("normal"),
  modelRoutingOverride: varchar("model_routing_override", { length: 32 }).notNull().default("balanced"),
  governanceStrictnessOverride: varchar("governance_strictness_override", { length: 32 }).notNull().default("standard"),
  graphTraversalDepth: real("graph_traversal_depth").notNull().default(2),
  connectorSyncOverride: varchar("connector_sync_override", { length: 32 }).notNull().default("normal"),
  contextPacketTierWeights: jsonb("context_packet_tier_weights").$type<Record<string, number>>().notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
});
export const modeHistory = pgTable("mode_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  modeName: varchar("mode_name", { length: 32 }).notNull(),
  activationReason: text("activation_reason").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const workspaceState = pgTable("workspace_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  stateKey: varchar("state_key", { length: 32 }).notNull().unique().default("primary"),
  currentMode: varchar("current_mode", { length: 32 }).notNull().default("morning"),
  manualOverride: boolean("manual_override").notNull().default(false),
  adaptiveEnabled: boolean("adaptive_enabled").notNull().default(true),
  lastChangedAt: timestamp("last_changed_at", { withTimezone: true }).defaultNow().notNull(),
});