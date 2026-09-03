import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
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

export const memoryIndex = pgTable(
  "memory_index",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectType: varchar("object_type", { length: 64 }).notNull(),
    objectId: uuid("object_id").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    projectId: text("project_id"),
    entityId: text("entity_id"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex("memory_index_object_unique").on(table.objectType, table.objectId),
    index("memory_index_project_idx").on(table.projectId),
    index("memory_index_entity_idx").on(table.entityId),
    index("memory_index_recorded_idx").on(table.recordedAt),
  ],
);

export const memoryConflict = pgTable(
  "memory_conflict",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conflictKey: varchar("conflict_key", { length: 128 }).notNull().unique(),
    leftObjectType: varchar("left_object_type", { length: 64 }).notNull(),
    leftObjectId: uuid("left_object_id").notNull(),
    rightObjectType: varchar("right_object_type", { length: 64 }).notNull(),
    rightObjectId: uuid("right_object_id").notNull(),
    summary: text("summary").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("memory_conflict_status_idx").on(table.status, table.createdAt)],
);

export const workingMemory = pgTable(
  "working_memory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scopeKey: varchar("scope_key", { length: 256 }).notNull(),
    sessionId: text("session_id"),
    objectiveId: text("objective_id"),
    version: integer("version").notNull().default(1),
    fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
    envelope: jsonb("envelope").$type<Record<string, unknown>>().notNull().default({}),
    selectedRefs: jsonb("selected_refs").$type<string[]>().notNull().default([]),
    excludedRefs: jsonb("excluded_refs").$type<string[]>().notNull().default([]),
    tokenEstimate: integer("token_estimate").notNull().default(0),
    attentionScore: real("attention_score").notNull().default(0),
    lastReason: text("last_reason").notNull().default("Context packet refresh"),
    lastAssembledAt: timestamp("last_assembled_at", { withTimezone: true }).defaultNow().notNull(),
    rebuiltAt: timestamp("rebuilt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("working_memory_scope_unique").on(table.scopeKey),
    index("working_memory_updated_idx").on(table.updatedAt),
    index("working_memory_session_idx").on(table.sessionId),
  ],
);

export const insertMemoryIndexSchema = createInsertSchema(memoryIndex, {
  tags: z.array(z.string()),
  metadata: jsonRecord,
});

export const insertMemoryConflictSchema = createInsertSchema(memoryConflict, {
  metadata: jsonRecord,
});

export const insertWorkingMemorySchema = createInsertSchema(workingMemory, {
  envelope: jsonRecord,
  selectedRefs: z.array(z.string()),
  excludedRefs: z.array(z.string()),
});