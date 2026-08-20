import { index, pgTable, text, timestamp, uuid, varchar, boolean } from "drizzle-orm/pg-core";
export const androidPairing = pgTable("android_pairing", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  fcmToken: text("fcm_token"),
  pushPlatform: varchar("push_platform", { length: 16 }),
  pushUpdatedAt: timestamp("push_updated_at", { withTimezone: true }),
}, (table) => [index("android_pairing_active_idx").on(table.active, table.expiresAt)]);