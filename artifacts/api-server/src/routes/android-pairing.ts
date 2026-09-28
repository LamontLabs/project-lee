import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  ClaimAndroidPairingInviteBody,
  ClaimAndroidPairingInviteResponse,
  CreateAndroidPairingInviteBody,
  CreateAndroidPairingInviteResponse,
} from "@workspace/api-zod";
import { androidPairing, androidPairingInvite, db } from "@workspace/db";
import { openJson, sealJson } from "../lib/secret-box";
const router: IRouter = Router();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const inviteLifetimeMs = 10 * 60 * 1000;
const pairingLifetimeMs = 90 * 24 * 60 * 60 * 1000;
const ownerOnly = (req: any, res: any) => {
  if (process.env.LEE_OWNER_USERNAME && !req.headers.cookie?.includes("lee_session=")) { res.status(401).json({ error: "Private Lee session required." }); return false; }
  return true;
};
router.get("/android/pairings", async (req, res) => {
  if (!ownerOnly(req,res)) return;
  const rows = await db.select({ id: androidPairing.id, label: androidPairing.label, createdAt: androidPairing.createdAt, expiresAt: androidPairing.expiresAt, rotatedAt: androidPairing.rotatedAt, revokedAt: androidPairing.revokedAt, active: androidPairing.active }).from(androidPairing).orderBy(desc(androidPairing.createdAt));
  res.json(rows);
});
router.post("/android/pairings", async (req, res) => {
  if (!ownerOnly(req,res)) return;
  const token = randomBytes(32).toString("base64url");
  const days = Math.min(365, Math.max(1, Number(req.body?.expiresInDays ?? 90)));
  const [row] = await db.insert(androidPairing).values({ label: String(req.body?.label ?? "Android companion"), tokenHash: hash(token), expiresAt: new Date(Date.now() + days * 86400000) }).returning();
  res.status(201).json({ ...row, token, warning: "Save this token now. It will not be shown again." });
});
router.post("/android/pairings/:id/rotate", async (req, res) => {
  if (!ownerOnly(req,res)) return;
  const token = randomBytes(32).toString("base64url");
  const [row] = await db.update(androidPairing).set({ tokenHash: hash(token), rotatedAt: new Date(), expiresAt: new Date(Date.now() + Math.min(365, Math.max(1, Number(req.body?.expiresInDays ?? 90))) * 86400000), revokedAt: null, active: true }).where(eq(androidPairing.id, req.params.id)).returning();
  if (!row) { res.status(404).json({ error: "Pairing not found." }); return; }
  res.json({ ...row, token, warning: "Save this token now. It will not be shown again." });
});
router.post("/android/pairings/:id/revoke", async (req, res) => {
  if (!ownerOnly(req,res)) return;
  const [row] = await db.update(androidPairing).set({ active: false, revokedAt: new Date() }).where(eq(androidPairing.id, req.params.id)).returning();
  if (!row) { res.status(404).json({ error: "Pairing not found." }); return; }
  res.json({ id: row.id, active: row.active, revokedAt: row.revokedAt });
});
router.post("/android/pairing-invites", async (req, res): Promise<void> => {
  const parsed = CreateAndroidPairingInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid Owner Android invitation request is required." });
    return;
  }
  const label = parsed.data.label?.trim() || "LEE Android";
  const invite = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + inviteLifetimeMs);
  const pairingToken = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    const [pairing] = await tx.insert(androidPairing).values({
      label,
      tokenHash: hash(pairingToken),
      expiresAt,
      active: false,
    }).returning({ id: androidPairing.id });
    if (!pairing) throw new Error("Android pairing could not be prepared.");
    await tx.insert(androidPairingInvite).values({
      pairingId: pairing.id,
      tokenHash: hash(invite),
      encryptedPairingToken: sealJson(pairingToken),
      expiresAt,
    });
  });
  res.status(201).json(CreateAndroidPairingInviteResponse.parse({
    deepLink: `lee-android://pair?invite=${encodeURIComponent(invite)}`,
    expiresAt,
  }));
});
router.post("/android/pairing-invites/claim", async (req, res): Promise<void> => {
  const parsed = ClaimAndroidPairingInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid Owner Android invitation is required." });
    return;
  }
  const now = new Date();
  const deviceId = parsed.data.deviceId.trim();
  if (!deviceId) {
    res.status(400).json({ error: "A valid Owner Android device identifier is required." });
    return;
  }
  const pairingExpiresAt = new Date(now.getTime() + pairingLifetimeMs);
  const result = await db.transaction(async (tx) => {
    const [claimedInvite] = await tx.update(androidPairingInvite)
      .set({ consumedAt: now, consumedDeviceId: deviceId })
      .where(and(
        eq(androidPairingInvite.tokenHash, hash(parsed.data.invite)),
        isNull(androidPairingInvite.consumedAt),
        gt(androidPairingInvite.expiresAt, now),
      ))
      .returning({
        pairingId: androidPairingInvite.pairingId,
        encryptedPairingToken: androidPairingInvite.encryptedPairingToken,
      });

    if (claimedInvite) {
      const [pairing] = await tx.update(androidPairing)
        .set({ active: true, expiresAt: pairingExpiresAt })
        .where(and(
          eq(androidPairing.id, claimedInvite.pairingId),
          eq(androidPairing.active, false),
          isNull(androidPairing.revokedAt),
        ))
        .returning({ id: androidPairing.id, expiresAt: androidPairing.expiresAt });
      if (!pairing) throw new Error("Android pairing credential could not be activated.");
      return {
        pairingId: pairing.id,
        expiresAt: pairing.expiresAt,
        encryptedPairingToken: claimedInvite.encryptedPairingToken,
      };
    }

    // If the server consumed an invitation but its response was interrupted,
    // only that same installation may retrieve the already-issued credential.
    const [retryInvite] = await tx.select({
      pairingId: androidPairingInvite.pairingId,
      encryptedPairingToken: androidPairingInvite.encryptedPairingToken,
    }).from(androidPairingInvite).where(and(
      eq(androidPairingInvite.tokenHash, hash(parsed.data.invite)),
      eq(androidPairingInvite.consumedDeviceId, deviceId),
      isNotNull(androidPairingInvite.consumedAt),
    )).limit(1);
    if (!retryInvite) return null;

    const [pairing] = await tx.select({
      id: androidPairing.id,
      expiresAt: androidPairing.expiresAt,
    }).from(androidPairing).where(and(
      eq(androidPairing.id, retryInvite.pairingId),
      eq(androidPairing.active, true),
      isNull(androidPairing.revokedAt),
      gt(androidPairing.expiresAt, now),
    )).limit(1);
    if (!pairing) return null;
    return {
      pairingId: pairing.id,
      expiresAt: pairing.expiresAt,
      encryptedPairingToken: retryInvite.encryptedPairingToken,
    };
  });
  if (!result) {
    res.status(401).json({ error: "This invitation is invalid, expired, or already used." });
    return;
  }
  const token = openJson(result.encryptedPairingToken);
  if (typeof token !== "string") throw new Error("Stored Android pairing credential is invalid.");
  res.json(ClaimAndroidPairingInviteResponse.parse({
    token,
    pairingId: result.pairingId,
    expiresAt: result.expiresAt,
  }));
});
export async function verifyAndroidPairing(token: string) {
  if (process.env.LEE_ANDROID_PAIRING_TOKEN && token === process.env.LEE_ANDROID_PAIRING_TOKEN) return true;
  const [row] = await db.select().from(androidPairing).where(and(eq(androidPairing.tokenHash, hash(token)), eq(androidPairing.active, true), isNull(androidPairing.revokedAt), gt(androidPairing.expiresAt, new Date()))).limit(1);
  return Boolean(row);
}
export default router;