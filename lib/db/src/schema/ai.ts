import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const conversation = pgTable("conversation", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull().default("Ask Lee"),
  mode: varchar("mode", { length: 32 }).notNull().default("normal"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversationMessage = pgTable("conversation_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  contextPacketId: uuid("context_packet_id"),
  intentId: uuid("intent_id"),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("conversation_message_conversation_idx").on(table.conversationId, table.createdAt)]);

export const contextPacket = pgTable("context_packet", {
  id: uuid("id").defaultRandom().primaryKey(),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  intent: text("intent").notNull(),
  mode: varchar("mode", { length: 32 }).notNull(),
  packet: jsonb("packet").$type<Record<string, unknown>>().notNull().default({}),
  sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
  excludedRefs: jsonb("excluded_refs").$type<string[]>().notNull().default([]),
  tokenEstimate: integer("token_estimate").notNull().default(0),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  selectedTier: varchar("selected_tier", { length: 16 }).notNull(),
  selectedModel: varchar("selected_model", { length: 96 }).notNull(),
  riskLevel: varchar("risk_level", { length: 16 }).notNull().default("LOW"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("context_packet_fingerprint_idx").on(table.fingerprint, table.expiresAt)]);

export const contextScore = pgTable("context_score", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectId: text("object_id").notNull(),
  intentId: uuid("intent_id"),
  contextValueScore: real("context_value_score").notNull(),
  factorBreakdown: jsonb("factor_breakdown").$type<Record<string, number>>().notNull().default({}),
  included: boolean("included").notNull().default(false),
  exclusionReason: text("exclusion_reason"),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("context_score_intent_idx").on(table.intentId, table.computedAt), index("context_score_object_idx").on(table.objectId, table.computedAt)]);

export const modelRouteDecision = pgTable("model_route_decision", {
  id: uuid("id").defaultRandom().primaryKey(),
  correlationId: text("correlation_id").notNull(),
  requestText: text("request_text").notNull(),
  mode: varchar("mode", { length: 32 }).notNull(),
  route: varchar("route", { length: 32 }).notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  model: varchar("model", { length: 96 }).notNull(),
  reason: text("reason").notNull(),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("selected"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("model_route_decision_created_idx").on(table.createdAt), index("model_route_decision_correlation_idx").on(table.correlationId)]);

export const insertConversationSchema = createInsertSchema(conversation);
export const insertConversationMessageSchema = createInsertSchema(conversationMessage, { evidenceRefs: z.array(z.string()) });
export const insertContextPacketSchema = createInsertSchema(contextPacket, { packet: jsonRecord, sourceRefs: z.array(z.string()), excludedRefs: z.array(z.string()) });
export const insertModelRouteDecisionSchema = createInsertSchema(modelRouteDecision);