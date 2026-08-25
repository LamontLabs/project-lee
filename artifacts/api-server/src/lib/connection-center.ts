import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { connection, db, eventLog, oauthCredential } from "@workspace/db";

export const CONNECTION_STATUSES = ["connected", "pending", "needs_reauthorization", "degraded", "unavailable", "incompatible", "disconnected"] as const;
export const CONNECTION_METHODS = ["oauth", "api", "system_contract", "local", "file", "webhook", "manual"] as const;
export const CONNECTION_PERMISSIONS = ["OBSERVE", "USE", "MANAGE", "GOVERNED_MANAGE"] as const;
export type ConnectionStatus = typeof CONNECTION_STATUSES[number];

export const oauthProviders = {
  github: { authorization: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token", scopes: ["read:user", "repo"], supportsRefresh: false },
  google_drive: { authorization: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scopes: ["https://www.googleapis.com/auth/drive.readonly"], supportsRefresh: true },
  google_calendar: { authorization: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scopes: ["https://www.googleapis.com/auth/calendar.readonly"], supportsRefresh: true },
  gmail: { authorization: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scopes: ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"], supportsRefresh: true },
} as const;
export type OAuthProvider = keyof typeof oauthProviders;
const oauthSecret = () => createHash("sha256").update(process.env.SESSION_SECRET ?? "development-session-secret").digest();
function seal(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", oauthSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
function unseal(value: string): Record<string, unknown> {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("OAuth credential is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", oauthSecret(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plain);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("OAuth credential is invalid.");
  return parsed as Record<string, unknown>;
}
export function signOAuthState(connectionId: string, provider: OAuthProvider, redirectUri: string, codeVerifier = randomBytes(32).toString("base64url")) {
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const payload = Buffer.from(JSON.stringify({ connectionId, provider, redirectUri, scopes: oauthProviders[provider].scopes, codeVerifier, codeChallenge, exp: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", oauthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
export function verifyOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("OAuth state is invalid.");
  const expected = createHmac("sha256", oauthSecret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("OAuth state is invalid.");
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { connectionId: string; provider: OAuthProvider; redirectUri: string; scopes: string[]; codeVerifier: string; codeChallenge: string; exp: number };
  if (!oauthProviders[value.provider] || value.exp < Date.now()) throw new Error("OAuth state has expired.");
  return value;
}
export async function storeOAuthCredential(connectionId: string, provider: OAuthProvider, token: Record<string, unknown>, scopes: string[], expiresAt?: Date | null) {
  const now = new Date();
  const encryptedValue = seal(token);
  await db.transaction(async (tx) => {
    await tx.insert(oauthCredential).values({ connectionId, provider, encryptedValue, scopes, expiresAt: expiresAt ?? null, updatedAt: now }).onConflictDoUpdate({ target: oauthCredential.connectionId, set: { provider, encryptedValue, scopes, expiresAt: expiresAt ?? null, updatedAt: now } });
    await tx.update(connection).set({ credentialRef: `OAUTH_${connectionId.replaceAll("-", "").toUpperCase()}`, updatedAt: now }).where(eq(connection.id, connectionId));
  });
}

const REFRESH_WINDOW_MS = 60_000;
const refreshFailureMessage = "OAuth authorization needs to be renewed.";

/**
 * Returns a provider access token only to server-side connector code. It is
 * intentionally not part of any connection projection, response, event, or log.
 */
export async function getOAuthAccessToken(connectionId: string): Promise<string> {
  const [record] = await db.select({
    connection: connection,
    credential: oauthCredential,
  }).from(connection).innerJoin(oauthCredential, eq(oauthCredential.connectionId, connection.id))
    .where(eq(connection.id, connectionId)).limit(1);
  if (!record || record.connection.method !== "oauth") throw new Error(refreshFailureMessage);
  const provider = record.connection.configuration?.oauthProvider;
  if (typeof provider !== "string" || !(provider in oauthProviders)) throw new Error(refreshFailureMessage);
  const config = oauthProviders[provider as OAuthProvider];
  let token: Record<string, unknown>;
  try {
    token = unseal(record.credential.encryptedValue);
  } catch {
    await setConnectionStatus(connectionId, "needs_reauthorization", refreshFailureMessage);
    throw new Error(refreshFailureMessage);
  }
  const accessToken = typeof token.access_token === "string" ? token.access_token : null;
  const expiresSoon = record.credential.expiresAt !== null &&
    record.credential.expiresAt.getTime() - Date.now() <= REFRESH_WINDOW_MS;
  if (!expiresSoon || !config.supportsRefresh) {
    if (!accessToken) {
      await setConnectionStatus(connectionId, "needs_reauthorization", refreshFailureMessage);
      throw new Error(refreshFailureMessage);
    }
    return accessToken;
  }
  const refreshToken = typeof token.refresh_token === "string" ? token.refresh_token : null;
  const clientId = process.env[`LEE_OAUTH_${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`LEE_OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`];
  if (!refreshToken || !clientId || !clientSecret) {
    await setConnectionStatus(connectionId, "needs_reauthorization", refreshFailureMessage);
    throw new Error(refreshFailureMessage);
  }
  try {
    const response = await fetch(config.token, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    const refreshed = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof refreshed.access_token !== "string") throw new Error("refresh failed");
    const rotated = { ...token, ...refreshed, refresh_token: typeof refreshed.refresh_token === "string" ? refreshed.refresh_token : refreshToken };
    const expiresAt = typeof refreshed.expires_in === "number" ? new Date(Date.now() + refreshed.expires_in * 1000) : record.credential.expiresAt;
    await storeOAuthCredential(connectionId, provider as OAuthProvider, rotated, record.credential.scopes, expiresAt);
    await setConnectionStatus(connectionId, "connected");
    return refreshed.access_token;
  } catch {
    await setConnectionStatus(connectionId, "needs_reauthorization", refreshFailureMessage);
    throw new Error(refreshFailureMessage);
  }
}

const secretKeys = /api[_-]?key|secret|password|token|private[_-]?key|credential/i;
function safeConfiguration(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) if (!secretKeys.test(key)) result[key] = item;
  return result;
}
function publicConnection(row: typeof connection.$inferSelect) {
  const { credentialRef: _credentialRef, ...safe } = row;
  return { ...safe, credentialConfigured: Boolean(row.credentialRef) };
}
async function audit(eventType: string, row: typeof connection.$inferSelect, payload: Record<string, unknown>) {
  await db.insert(eventLog).values({ eventType, aggregateType: "connection", aggregateId: row.id, sourceRef: `connection:${row.id}`, occurredAt: new Date(), payload: { connectionId: row.id, method: row.method, targetType: row.targetType, ...payload } });
}

export async function listConnections() {
  const rows = await db.select({ connection, credential: oauthCredential }).from(connection).leftJoin(oauthCredential, eq(oauthCredential.connectionId, connection.id)).orderBy(connection.updatedAt);
  return rows.map(({ connection: row, credential }) => ({ ...publicConnection(row), grantedScopes: credential?.scopes ?? [] }));
}

export async function createConnection(input: {
  displayName: string; targetType: string; method: string; baseUrl?: string | null; healthEndpoint?: string | null;
  credentialRef?: string | null; contractVersion?: string | null; permissions?: string[]; capabilities?: Record<string, unknown>[];
  dependencies?: Record<string, unknown>[]; configuration?: Record<string, unknown>;
}) {
  if (!CONNECTION_METHODS.includes(input.method as typeof CONNECTION_METHODS[number])) throw new Error("Unsupported connection method.");
  const permissions = (input.permissions ?? ["OBSERVE"]).filter((item) => CONNECTION_PERMISSIONS.includes(item as typeof CONNECTION_PERMISSIONS[number]));
  if (!permissions.length) throw new Error("At least OBSERVE permission is required.");
  const [row] = await db.insert(connection).values({
    displayName: input.displayName.trim(), targetType: input.targetType, method: input.method, status: "pending", authStatus: input.method === "oauth" ? "pending" : "not_connected",
    baseUrl: input.baseUrl?.trim().replace(/\/$/, "") || null, healthEndpoint: input.healthEndpoint?.trim() || null,
    credentialRef: input.credentialRef?.trim() || null, contractVersion: input.contractVersion?.trim() || null, permissions,
    capabilities: input.capabilities ?? [], dependencies: input.dependencies ?? [], configuration: safeConfiguration(input.configuration), updatedAt: new Date(),
  }).returning();
  await audit("ConnectionCreated", row, { status: row.status, permissions });
  return publicConnection(row);
}

export async function updateConnectionPermissions(id: string, permissions: string[]) {
  const next = [...new Set(permissions)].filter((item) => CONNECTION_PERMISSIONS.includes(item as typeof CONNECTION_PERMISSIONS[number]));
  if (!next.length) throw new Error("At least OBSERVE permission is required.");
  const [row] = await db.update(connection).set({ permissions: next, updatedAt: new Date() }).where(eq(connection.id, id)).returning();
  if (!row) return null;
  await audit("ConnectionPermissionsChanged", row, { permissions: next });
  return publicConnection(row);
}

export async function authorizeConnectionCapability(id: string, required: typeof CONNECTION_PERMISSIONS[number], authorizationPath?: string) {
  const [row] = await db.select().from(connection).where(eq(connection.id, id)).limit(1);
  if (!row || row.status !== "connected") return { allowed: false, reason: "Connection is not connected." };
  const granted = new Set(row.permissions);
  const allowed = granted.has(required) && (required !== "GOVERNED_MANAGE" || authorizationPath === "CerbaSeal_ALLOW");
  return { allowed, reason: allowed ? null : required === "GOVERNED_MANAGE" ? "GOVERNED_MANAGE requires the declared CerbaSeal ALLOW path." : `Connection does not grant ${required} permission.` };
}

export async function setConnectionStatus(id: string, status: ConnectionStatus, error?: string | null) {
  const [row] = await db.update(connection).set({ status, authStatus: status === "needs_reauthorization" ? "expired" : status === "connected" ? "connected" : status === "pending" ? "pending" : "unknown", lastError: error ?? null, lastHealthCheck: new Date(), updatedAt: new Date() }).where(eq(connection.id, id)).returning();
  if (!row) return null;
  await audit(status === "needs_reauthorization" ? "ConnectionReauthorizationRequired" : status === "disconnected" ? "ConnectionDisconnected" : "ConnectionHealthChanged", row, { status, error: error ?? null });
  return publicConnection(row);
}

export async function testConnection(id: string) {
  const [row] = await db.select().from(connection).where(eq(connection.id, id)).limit(1);
  if (!row) return null;
  if (row.method === "oauth") {
    try { await getOAuthAccessToken(id); return setConnectionStatus(id, "connected"); }
    catch { return setConnectionStatus(id, "needs_reauthorization", refreshFailureMessage); }
  }
  if (!row.baseUrl) return setConnectionStatus(id, row.method === "file" ? "connected" : "unavailable", row.method === "file" ? null : "A reachable endpoint is required for this connection method.");
  const url = `${row.baseUrl}${row.healthEndpoint ?? "/health"}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "X-LEE-Identity": "lee", "X-LEE-Connection-Test": "true" } });
    if (!response.ok) return setConnectionStatus(id, response.status === 401 || response.status === 403 ? "needs_reauthorization" : "degraded", `Health check returned HTTP ${response.status}.`);
    return setConnectionStatus(id, row.contractVersion && row.contractVersion !== "v1" ? "incompatible" : "connected");
  } catch (error) {
    return setConnectionStatus(id, "unavailable", error instanceof Error ? error.message : "Health check failed.");
  } finally { clearTimeout(timer); }
}

export function verifyWebhookSignature(rawBody: string, signature: string, timestamp: string, secret: string) {
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const received = Buffer.from(signature, "hex");
  const computed = Buffer.from(expected, "hex");
  return received.length === computed.length && timingSafeEqual(received, computed);
}