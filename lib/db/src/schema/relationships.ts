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

export const person = pgTable(
  "person",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identityKey: varchar("identity_key", { length: 240 }).notNull().unique(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }),
    roles: jsonb("roles").$type<string[]>().notNull().default([]),
    organizationalRole: varchar("organizational_role", { length: 64 }),
    expertise: jsonb("expertise").$type<string[]>().notNull().default([]),
    projects: jsonb("projects").$type<string[]>().notNull().default([]),
    communicationRhythm: varchar("communication_rhythm", { length: 32 }).notNull().default("monthly"),
    trustScore: real("trust_score").notNull().default(0.5),
    currentState: varchar("current_state", { length: 32 }).notNull().default("nominal"),
    relationshipHealth: varchar("relationship_health", { length: 32 }).notNull().default("unknown"),
    recommendedCadenceDays: integer("recommended_cadence_days").notNull().default(30),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by").notNull().default("migration"),
    modifiedBy: text("modified_by"),
    modifiedAt: timestamp("modified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ageState: varchar("age_state", { length: 16 }).notNull().default("FRESH"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    importedFrom: jsonb("imported_from").$type<Record<string, unknown>>(),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>(),
    currentOwner: text("current_owner").notNull().default("owner"),
  },
  (table) => [
    index("person_health_idx").on(table.relationshipHealth),
    index("person_email_idx").on(table.email),
    index("person_state_idx").on(table.currentState),
  ],
);

export const relationshipInteraction = pgTable(
  "relationship_interaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id").notNull(),
    normalizedEventId: uuid("normalized_event_id"),
    provider: varchar("provider", { length: 64 }),
    direction: varchar("direction", { length: 16 }).notNull().default("unknown"),
    summary: text("summary").notNull(),
    sourceRef: text("source_ref").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("relationship_interaction_person_time_idx").on(table.personId, table.occurredAt),
    index("relationship_interaction_event_idx").on(table.normalizedEventId),
  ],
);
export const relationshipPromise = pgTable("relationship_promise", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id").notNull(),
  direction: varchar("direction", { length: 16 }).notNull().default("outgoing"),
  statement: text("statement").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  sourceRef: text("source_ref").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const relationshipQuestion = pgTable("relationship_question", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id").notNull(),
  question: text("question").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  sourceRef: text("source_ref").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const relationshipHealthScore = pgTable("relationship_health_score", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id").notNull(),
  score: real("score").notNull().default(50),
  momentum: varchar("momentum", { length: 16 }).notNull().default("dormant"),
  rationale: text("rationale").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPersonSchema = createInsertSchema(person, {
  roles: z.array(z.string()),
  expertise: z.array(z.string()),
  projects: z.array(z.string()),
  metadata: jsonRecord,
});

export const insertRelationshipInteractionSchema = createInsertSchema(relationshipInteraction, {
  metadata: jsonRecord,
});