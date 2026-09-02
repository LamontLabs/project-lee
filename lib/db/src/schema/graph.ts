import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const graphNode = pgTable(
  "graph_node",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectType: varchar("object_type", { length: 64 }).notNull(),
    objectId: uuid("object_id").notNull(),
    label: text("label"),
    importanceScore: real("importance_score").notNull().default(0.5),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by").notNull().default("migration"),
    modifiedBy: text("modified_by"),
    modifiedAt: timestamp("modified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    importedFrom: jsonb("imported_from").$type<Record<string, unknown>>(),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>(),
    currentOwner: text("current_owner").notNull().default("owner"),
  },
  (table) => [
    uniqueIndex("graph_node_object_unique").on(table.objectType, table.objectId),
    index("graph_node_type_idx").on(table.objectType),
  ],
);

export const graphEdge = pgTable(
  "graph_edge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceNodeId: uuid("source_node_id").notNull(),
    targetNodeId: uuid("target_node_id").notNull(),
    edgeType: varchar("edge_type", { length: 64 }).notNull(),
    confidence: real("confidence").notNull().default(0.5),
    weight: real("weight").notNull().default(0.5),
    freshnessScore: real("freshness_score").notNull().default(1),
    sourceRef: text("source_ref").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    isHistorical: boolean("is_historical").notNull().default(false),
  },
  (table) => [
    uniqueIndex("graph_edge_unique").on(table.sourceNodeId, table.targetNodeId, table.edgeType),
    index("graph_edge_source_idx").on(table.sourceNodeId, table.edgeType),
    index("graph_edge_target_idx").on(table.targetNodeId, table.edgeType),
    index("graph_edge_type_idx").on(table.edgeType),
  ],
);

export const insertGraphNodeSchema = createInsertSchema(graphNode, {
  metadata: jsonRecord,
});
export const insertGraphEdgeSchema = createInsertSchema(graphEdge, {
  metadata: jsonRecord,
});