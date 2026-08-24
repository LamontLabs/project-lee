import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { connection, db, eventLog } from "@workspace/db";

export const CONNECTION_STATUSES = ["connected", "pending", "needs_reauthorization", "degraded", "unavailable", "incompatible", "disconnected"] as const;
export const CONNECTION_METHODS = ["oauth", "api", "system_contract", "local", "file", "webhook", "manual"] as const;
export const CONNECTION_PERMISSIONS = ["OBSERVE", "USE", "MANAGE", "GOVERNED_MANAGE"] as const;
export type ConnectionStatus = typeof CONNECTION_STATUSES[number];

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
  const rows = await db.select().from(connection).orderBy(connection.updatedAt);
  return rows.map(publicConnection);
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
  const [row] = await db.update(connection).set({ status, authStatus: status === "needs_reauthorization" ? "expired" : status === "connected" ? "connected" : "unknown", lastError: error ?? null, lastHealthCheck: new Date(), updatedAt: new Date() }).where(eq(connection.id, id)).returning();
  if (!row) return null;
  await audit(status === "needs_reauthorization" ? "ConnectionReauthorizationRequired" : status === "disconnected" ? "ConnectionDisconnected" : "ConnectionHealthChanged", row, { status, error: error ?? null });
  return publicConnection(row);
}

export async function testConnection(id: string) {
  const [row] = await db.select().from(connection).where(eq(connection.id, id)).limit(1);
  if (!row) return null;
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