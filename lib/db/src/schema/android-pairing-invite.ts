import { createInsertSchema } from "drizzle-zod";
import { foreignKey, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { androidPairing } from "./android-pairing";

// Preserve the existing development table contract, including its encrypted
// credential payload and device-bound claim metadata.
export const androidPairingInvite = pgTable("android_pairing_invite", {
  id: uuid("id").defaultRandom().primaryKey(),
  pairingId: uuid("pairing_id").notNull(),
  tokenHash: text("token_hash").notNull().unique("android_pairing_invite_token_hash_key"),
  encryptedPairingToken: text("encrypted_pairing_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  consumedDeviceId: text("consumed_device_id"),
}, (table) => [
  foreignKey({
    name: "android_pairing_invite_pairing_id_fkey",
    columns: [table.pairingId],
    foreignColumns: [androidPairing.id],
  }).onDelete("cascade"),
  index("android_pairing_invite_active_idx").on(table.expiresAt, table.consumedAt),
  index("android_pairing_invite_pairing_idx").on(table.pairingId),
]);

export const insertAndroidPairingInviteSchema = createInsertSchema(androidPairingInvite).omit({
  id: true,
  createdAt: true,
  consumedAt: true,
  consumedDeviceId: true,
});

export type InsertAndroidPairingInvite = z.infer<typeof insertAndroidPairingInviteSchema>;
export type AndroidPairingInvite = typeof androidPairingInvite.$inferSelect;