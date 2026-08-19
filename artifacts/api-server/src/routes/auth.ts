import { Router, type IRouter } from "express";
import { clearSession, cookieName, createSession } from "../middlewares/private-auth";
const router: IRouter = Router();
router.post("/auth/login", (req, res) => {
  const username = process.env.LEE_OWNER_USERNAME;
  const password = process.env.LEE_OWNER_PASSWORD;
  if (!username || !password || req.body?.username !== username || req.body?.password !== password) { res.status(401).json({ error: "Invalid owner credentials." }); return; }
  const session = createSession();
  res.setHeader("Set-Cookie", `${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/api${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ authenticated: true, expiresInMs: Number(process.env.LEE_SESSION_TTL_MS ?? 8 * 60 * 60 * 1000) });
});
router.get("/auth/session", (req, res) => { res.setHeader("Cache-Control", "no-store"); res.json({ authenticated: !process.env.LEE_OWNER_USERNAME || Boolean(req.headers.cookie?.includes(`${cookieName}=`)) }); });
router.post("/auth/logout", (req, res) => { const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1); clearSession(cookie); res.setHeader("Set-Cookie", `${cookieName}=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/api`); res.json({ authenticated: false }); });
export default router;