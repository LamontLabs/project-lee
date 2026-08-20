import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { androidPairing, db } from "@workspace/db";
const router: IRouter = Router();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
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
export async function verifyAndroidPairing(token: string) {
  if (process.env.LEE_ANDROID_PAIRING_TOKEN && token === process.env.LEE_ANDROID_PAIRING_TOKEN) return true;
  const [row] = await db.select().from(androidPairing).where(and(eq(androidPairing.tokenHash, hash(token)), eq(androidPairing.active, true), isNull(androidPairing.revokedAt), gt(androidPairing.expiresAt, new Date()))).limit(1);
  return Boolean(row);
}
export default router;