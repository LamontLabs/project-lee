import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const scheduledJob = pgTable(
  "scheduled_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobType: varchar("job_type", { length: 96 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    recurrence: varchar("recurrence", { length: 160 }),
    dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("scheduled_job_due_idx").on(table.status, table.runAt),
    index("scheduled_job_type_idx").on(table.jobType, table.status),
  ],
);

export const insertScheduledJobSchema = createInsertSchema(scheduledJob, {
  dependencies: z.array(z.string()),
  payload: jsonRecord,
});