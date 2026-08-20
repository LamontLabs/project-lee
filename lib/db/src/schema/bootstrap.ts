import { jsonb, pgTable, text, timestamp, uuid, varchar, integer } from "drizzle-orm/pg-core";
export const bootstrapRun = pgTable("bootstrap_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull(),
  repositoryId: text("repository_id").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  factsCreatedCount: integer("facts_created_count").notNull().default(0),
  interpretationsCreatedCount: integer("interpretations_created_count").notNull().default(0),
  graphNodesCreatedCount: integer("graph_nodes_created_count").notNull().default(0),
  relationshipsDetected: integer("relationships_detected").notNull().default(0),
  questionsGenerated: integer("questions_generated").notNull().default(0),
  issuesFlagged: integer("issues_flagged").notNull().default(0),
  report: jsonb("report").$type<Record<string, unknown>>().notNull().default({}),
  error: text("error"),
});