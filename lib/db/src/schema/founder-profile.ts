import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const founderProfile = pgTable("founder_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileKey: varchar("profile_key", { length: 64 }).notNull().unique().default("primary"),
  version: integer("version").notNull().default(1),
  dimensions: jsonb("dimensions").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const founderProfileHistory = pgTable("founder_profile_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull(),
  version: integer("version").notNull(),
  dimensions: jsonb("dimensions").$type<Record<string, unknown>>().notNull(),
  changeReason: text("change_reason").notNull(),
  confirmedByOwner: boolean("confirmed_by_owner").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("founder_profile_history_idx").on(table.profileId, table.version)]);

export const founderProfileCorrection = pgTable("founder_profile_correction", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull(),
  dimension: varchar("dimension", { length: 96 }).notNull(),
  previousValue: jsonb("previous_value"),
  correctedValue: jsonb("corrected_value").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("founder_profile_correction_dim_idx").on(table.profileId, table.dimension, table.createdAt)]);