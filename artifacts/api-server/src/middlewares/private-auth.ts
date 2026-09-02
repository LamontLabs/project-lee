import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { getEngine } from "../lib/capability-registry";
import { ownerExists, sessionSecret } from "../lib/owner-auth";

const cookieName = "lee_session";
const sessions = new Map<string, number>();

function signature(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

export function isValidSession(raw: string | undefined) {
  if (!raw) return false;
  const [token, expiry, provided] = raw.split(".");
  if (!token || !expiry || !provided || !/^\d+$/.test(expiry)) return false;
  const expected = signature(`${token}.${expiry}`);
  const valid = provided.length === expected.length
    && timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    && Number(expiry) >= Date.now()
    && sessions.get(token) === Number(expiry);
  if (!valid) sessions.delete(token);
  return valid;
}

export function privateAuth(enabled = Boolean(process.env.LEE_OWNER_USERNAME && process.env.LEE_OWNER_PASSWORD)) {
  const middleware: RequestHandler = (req, res, next) => {
    const configured = enabled || ownerExists();
    const desktopConfigured = configured || Boolean(process.env.LEE_DATA_DIR);
    if (req.path === "/contract" || req.path === "/system-contract" || req.path === "/contract.json" || (!desktopConfigured && !configured) || req.path.startsWith("/api/android/") && !req.path.startsWith("/api/android/pairing") || req.path === "/email/gmail/webhook" || req.path.endsWith("/health") || req.path.endsWith("/healthz") || req.path.endsWith("/auth/login") || req.path.endsWith("/auth/session") || req.path.endsWith("/auth/logout") || req.path.endsWith("/auth/enroll")) { next(); return; }
    if (!configured) { res.status(428).json({ error: "Owner enrollment is required before using the private Lee API.", enrollmentRequired: true }); return; }
    const raw = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!raw) { res.status(401).json({ error: "Private Lee session required." }); return; }
    if (!isValidSession(raw)) {
      res.status(401).json({ error: "Lee session is invalid or expired." });
      return;
    }
    next();
  };
  return middleware;
}

export function internalServiceAuth(): RequestHandler {
  return async (req, res, next) => {
    const engineId = String(req.header("x-engine-id") ?? "").trim();
    const configuredToken = process.env.INTERNAL_API_TOKEN;
    const suppliedToken = req.header("x-internal-token");
    const engine = engineId ? await getEngine(engineId) : null;
    if (!engine || (configuredToken && suppliedToken !== configuredToken)) {
      res.status(403).json({ error: "Registered engine identity and internal authorization are required." });
      return;
    }
    res.locals.engineIdentity = engine;
    next();
  };
}

export function createSession() {
  const token = randomBytes(32).toString("hex");
  const expiry = Date.now() + Number(process.env.LEE_SESSION_TTL_MS ?? 8 * 60 * 60 * 1000);
  sessions.set(token, expiry);
  return `${token}.${expiry}.${signature(`${token}.${expiry}`)}`;
}

export function clearSession(cookie: string | undefined) {
  if (cookie) sessions.delete(cookie.split(".")[0]);
}

export { cookieName };