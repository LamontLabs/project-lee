import { Router, type IRouter } from "express";
import { z } from "zod";
import { connection, db, eventLog } from "@workspace/db";
import { authorizeConnectionCapability, createConnection, listConnections, oauthProviders, setConnectionStatus, signOAuthState, storeOAuthCredential, testConnection, updateConnectionPermissions, verifyOAuthState, verifyWebhookSignature, type OAuthProvider } from "../lib/connection-center";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { importSource } from "../lib/understanding-pipeline";
import { ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const createSchema = z.object({
  displayName: z.string().min(1).max(160), targetType: z.string().min(1).max(32), method: z.string().min(1).max(32),
  baseUrl: z.string().url().optional().nullable(), healthEndpoint: z.string().regex(/^\/[a-zA-Z0-9._/:-]*$/).optional().nullable(),
  credentialRef: z.string().regex(/^[A-Z][A-Z0-9_]{2,159}$/).optional().nullable(), contractVersion: z.string().max(32).optional().nullable(),
  permissions: z.array(z.string()).optional(), capabilities: z.array(z.record(z.unknown())).optional(), dependencies: z.array(z.record(z.unknown())).optional(), configuration: z.record(z.unknown()).optional(),
});
const callbackQuery = z.object({ code: z.string().min(1).optional(), state: z.string().min(1), error: z.string().optional() });
const providerFrom = (row: typeof connection.$inferSelect) => {
  const provider = row.configuration?.oauthProvider;
  return typeof provider === "string" && provider in oauthProviders ? provider as OAuthProvider : null;
};
router.get("/connections", async (_req, res) => res.json(await listConnections()));
router.post("/connections", async (req, res): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid connection setup.", issues: parsed.error.issues }); return; }
  try { res.status(201).json(await createConnection(parsed.data)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Connection setup failed." }); }
});
router.post("/connections/:id/test", async (req, res): Promise<void> => {
  try { const result = await testConnection(req.params.id); if (!result) { res.status(404).json({ error: "Connection not found." }); return; } res.json(result); } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : "Connection test failed." }); }
});
router.patch("/connections/:id/permissions", async (req, res): Promise<void> => {
  const parsed = z.object({ permissions: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Permissions must be a non-empty list." }); return; }
  try { const result = await updateConnectionPermissions(req.params.id, parsed.data.permissions); if (!result) { res.status(404).json({ error: "Connection not found." }); return; } res.json(result); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Permission update failed." }); }
});
router.post("/connections/:id/capability-check", async (req, res): Promise<void> => {
  const parsed = z.object({ required: z.enum(["OBSERVE", "USE", "MANAGE", "GOVERNED_MANAGE"]), authorizationPath: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A valid capability permission is required." }); return; }
  res.json(await authorizeConnectionCapability(req.params.id, parsed.data.required, parsed.data.authorizationPath));
});
router.post("/connections/:id/reauthorize", async (req, res): Promise<void> => {
  const [row] = await db.select().from(connection).where(eq(connection.id, req.params.id)).limit(1);
  if (!row) { res.status(404).json({ error: "Connection not found." }); return; }
  if (row.method === "oauth") {
    const provider = providerFrom(row);
    if (!provider) { res.status(400).json({ error: "This OAuth provider is not supported." }); return; }
    const redirectUri = `${req.protocol}://${req.get("host")}/api/connections/oauth/callback`;
    const clientId = process.env[`LEE_OAUTH_${provider.toUpperCase()}_CLIENT_ID`];
    if (!clientId) { res.status(503).json({ error: "OAuth is not configured for this provider." }); return; }
    await setConnectionStatus(row.id, "pending");
    const config = oauthProviders[provider];
    const state = signOAuthState(row.id, provider, redirectUri);
    const signedState = verifyOAuthState(state);
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: config.scopes.join(" "), state, code_challenge: signedState.codeChallenge, code_challenge_method: "S256" });
    if (provider.startsWith("google_")) { params.set("access_type", "offline"); params.set("prompt", "consent"); }
    res.json({ authorizationUrl: `${config.authorization}?${params}` }); return;
  }
  const result = await setConnectionStatus(req.params.id, "pending");
  if (!result) { res.status(404).json({ error: "Connection not found." }); return; }
  res.json(result);
});
router.get("/connections/oauth/callback", async (req, res): Promise<void> => {
  const parsed = callbackQuery.safeParse(req.query);
  if (!parsed.success) { res.status(400).send("OAuth callback is invalid."); return; }
  try {
    const state = verifyOAuthState(parsed.data.state);
    if (parsed.data.error || !parsed.data.code) throw new Error("OAuth authorization was not granted.");
    const [row] = await db.select().from(connection).where(eq(connection.id, state.connectionId)).limit(1);
    if (!row || row.method !== "oauth" || providerFrom(row) !== state.provider) throw new Error("OAuth connection is invalid.");
    const clientId = process.env[`LEE_OAUTH_${state.provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`LEE_OAUTH_${state.provider.toUpperCase()}_CLIENT_SECRET`];
    if (!clientId || !clientSecret) throw new Error("OAuth is not configured for this provider.");
    const response = await fetch(oauthProviders[state.provider].token, { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: parsed.data.code, redirect_uri: state.redirectUri, grant_type: "authorization_code", code_verifier: state.codeVerifier }) });
    const token = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof token.access_token !== "string") throw new Error("OAuth token exchange failed.");
    const granted = typeof token.scope === "string" ? token.scope.split(/[ ,]+/).filter(Boolean) : state.scopes;
    if (!state.scopes.every((scope) => granted.includes(scope))) throw new Error("OAuth did not grant the required scopes.");
    const expiresAt = typeof token.expires_in === "number" ? new Date(Date.now() + token.expires_in * 1000) : null;
    await storeOAuthCredential(row.id, state.provider, token, granted, expiresAt);
    await setConnectionStatus(row.id, "connected");
    res.send("<h1>Connection complete</h1><p>You can close this window and return to LEE.</p>");
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth authorization failed.";
    try { const state = verifyOAuthState(String(parsed.data.state)); await setConnectionStatus(state.connectionId, "needs_reauthorization", message); } catch { /* state errors cannot identify a connection */ }
    res.status(400).send(`<h1>Connection not completed</h1><p>${message.replace(/[<>&"]/g, "")}</p>`);
  }
});
router.delete("/connections/:id", async (req, res): Promise<void> => {
  const result = await setConnectionStatus(req.params.id, "disconnected");
  if (!result) { res.status(404).json({ error: "Connection not found." }); return; }
  res.json(result);
});
router.post("/connections/:id/import", async (req, res): Promise<void> => {
  const [row] = await db.select().from(connection).where(eq(connection.id, req.params.id)).limit(1);
  const { filename, mimeType, objectPath, sourceKind, relativePath } = req.body ?? {};
  if (!row || row.method !== "file") { res.status(404).json({ error: "Imported file or folder connection not found." }); return; }
  if (typeof filename !== "string" || typeof mimeType !== "string" || typeof objectPath !== "string" || !objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "filename, mimeType, and a valid objectPath are required." }); return;
  }
  try {
    const stored = await storage.read(objectPath);
    const result = await importSource({
      filename, mimeType, content: stored.buffer.toString("utf8"), storagePath: objectPath,
      metadata: { sourceKind: typeof sourceKind === "string" ? sourceKind : "file", relativePath: typeof relativePath === "string" ? relativePath : filename, byteSize: stored.size, importedAt: new Date().toISOString() },
      importedFrom: { connectionId: row.id, connectionName: row.displayName, method: row.method, sourceKind: typeof sourceKind === "string" ? sourceKind : "file" },
    });
    await setConnectionStatus(row.id, "connected");
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    req.log.error({ error, connectionId: row.id }, "Connection import failed");
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "The imported object is no longer available. No source was created." }); return; }
    res.status(500).json({ error: error instanceof Error ? error.message : "Connection import failed." });
  }
});
router.post("/connections/:id/webhook", async (req, res): Promise<void> => {
  const [row] = await db.select().from(connection).where(eq(connection.id, req.params.id)).limit(1);
  if (!row || row.method !== "webhook") { res.status(404).json({ error: "Webhook connection not found." }); return; }
  const timestamp = String(req.header("X-LEE-Timestamp") ?? "");
  const signature = String(req.header("X-LEE-Signature") ?? "");
  const secret = row.credentialRef ? process.env[row.credentialRef] : undefined;
  const rawBody = JSON.stringify(req.body ?? {});
  if (!secret || !verifyWebhookSignature(rawBody, signature, timestamp, secret)) { res.status(401).json({ error: "Webhook authentication failed." }); return; }
  await db.insert(eventLog).values({ eventType: "EventDeliveryTested", aggregateType: "connection_webhook", aggregateId: row.id, sourceRef: `connection:${row.id}`, occurredAt: new Date(), payload: { connectionId: row.id, received: true, eventId: req.header("X-LEE-Event-Id") ?? null } });
  await setConnectionStatus(row.id, "connected");
  res.status(202).json({ accepted: true, connectionId: row.id });
});
export default router;