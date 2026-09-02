import { Router, type IRouter } from "express";
import { clearSession, cookieName, createSession, isValidSession } from "../middlewares/private-auth";
import { enrollOwner, ownerExists, verifyOwner } from "../lib/owner-auth";
const router: IRouter = Router();
router.post("/auth/enroll", async (req, res) => {
  try { await enrollOwner(req.body?.username, req.body?.password); } catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "Owner enrollment could not be completed." }); return; }
  const session = createSession();
  res.setHeader("Set-Cookie", `${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/api${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ authenticated: true });
});
router.post("/auth/login", async (req, res) => {
  if (!ownerExists()) { res.status(428).json({ error: "Owner enrollment is required before sign-in.", enrollmentRequired: true }); return; }
  if (!(await verifyOwner(req.body?.username, req.body?.password))) { res.status(401).json({ error: "Invalid owner credentials." }); return; }
  const session = createSession();
  res.setHeader("Set-Cookie", `${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/api${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ authenticated: true, expiresInMs: Number(process.env.LEE_SESSION_TTL_MS ?? 8 * 60 * 60 * 1000) });
});
router.get("/auth/session", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!ownerExists()) { res.json({ authenticated: false, enrollmentRequired: true }); return; }
  const raw = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!raw) { res.json({ authenticated: false }); return; }
  res.json({ authenticated: isValidSession(raw) });
});
router.post("/auth/logout", (req, res) => { const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1); clearSession(cookie); res.setHeader("Set-Cookie", `${cookieName}=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/api`); res.json({ authenticated: false }); });
export default router;