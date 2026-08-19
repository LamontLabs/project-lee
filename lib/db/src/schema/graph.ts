import { createInsertSchema } from "drizzle-zod";
import {
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
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
    sourceRef: text("source_ref").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("graph_edge_unique").on(table.sourceNodeId, table.targetNodeId, table.edgeType),
    index("graph_edge_source_idx").on(table.sourceNodeId, table.edgeType),
    index("graph_edge_target_idx").on(table.targetNodeId, table.edgeType),
  ],
);

export const insertGraphNodeSchema = createInsertSchema(graphNode, {
  metadata: jsonRecord,
});
export const insertGraphEdgeSchema = createInsertSchema(graphEdge, {
  metadata: jsonRecord,
});