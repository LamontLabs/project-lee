import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const localServiceContract = pgTable(
  "local_service_contract",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contractId: varchar("contract_id", { length: 64 }).notNull().unique(),
    provider: varchar("provider", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    description: varchar("description", { length: 240 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull().default("service"),
    port: integer("port").notNull(),
    paths: text("paths").array().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    createdBy: varchar("created_by", { length: 80 }).notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("local_service_contract_enabled_idx").on(table.enabled, table.updatedAt)],
);

export const insertLocalServiceContractSchema = createInsertSchema(localServiceContract).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLocalServiceContract = z.infer<typeof insertLocalServiceContractSchema>;
export type LocalServiceContract = typeof localServiceContract.$inferSelect;