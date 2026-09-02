import { jsonb, real, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const executionReadiness = pgTable("execution_readiness", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull(), goal: varchar("goal",{length:32}).notNull().default("general"),
  overallScore: real("overall_score").notNull(), dimensions: jsonb("dimensions").$type<Array<{ key:string; score:number; explanation:string; sourceRefs:string[] }>>().notNull().default([]),
  highestGap: varchar("highest_gap",{length:64}), computedAt: timestamp("computed_at",{withTimezone:true}).defaultNow().notNull(),
});