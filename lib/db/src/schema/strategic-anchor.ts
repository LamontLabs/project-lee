import { index, jsonb, pgTable, text, timestamp, uuid, varchar, boolean } from "drizzle-orm/pg-core";
export const strategicAnchor = pgTable("strategic_anchor", {
  id: uuid("id").defaultRandom().primaryKey(),
  anchorType: varchar("anchor_type", { length: 32 }).notNull(),
  summary: text("summary").notNull(),
  fullContext: text("full_context").notNull(),
  projectId: text("project_id"),
  sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
  whyChain: jsonb("why_chain").$type<Record<string, unknown>[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
}, (table) => [index("strategic_anchor_active_type_idx").on(table.active, table.anchorType), index("strategic_anchor_project_idx").on(table.projectId)]);