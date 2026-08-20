import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
export const timeMachineSnapshot = pgTable("time_machine_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  targetAt: timestamp("target_at", { withTimezone: true }).notNull(),
  reference: text("reference").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
});