import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, eventLog, internalCapabilityService } from "@workspace/db";

export type UniversalSystemRegistration = {
  systemId: string;
  displayName: string;
  category: string;
  baseUrl: string;
  apiVersion?: string;
  healthEndpoint?: string;
  failurePolicy?: "graceful_degradation" | "fail_closed";
  credentialEnvKey?: string;
  credentialHeader?: string;
  requestEnvelope?: "contract" | "direct";
  capabilities: string[];
};

function headers(body: string, systemId: string, credential: string | undefined, correlationId: string, metrics: Record<string, unknown>) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = createHash("sha256").update(body).digest("hex");
  const secret = process.env[`${systemId.toUpperCase().replaceAll("-", "_")}_HMAC_SECRET`] ?? credential ?? "";
  const signature = createHmac("sha256", secret).update(`${correlationId}.${timestamp}.${digest}`).digest("hex");
  return {
    "content-type": "application/json",
    "X-LEE-Identity": "lee",
    "X-LEE-System-Id": systemId,
    "X-LEE-Correlation-Id": correlationId,
    "X-LEE-Timestamp": timestamp,
    "X-LEE-Signature": signature,
    ...(credential && metrics.credentialHeader === "x-api-key" ? { "x-api-key": credential } : {}),
    ...(credential && metrics.credentialHeader === "x-goog-api-key" ? { "x-goog-api-key": credential } : {}),
    ...(credential && (!metrics.credentialHeader || metrics.credentialHeader === "authorization") ? { authorization: `Bearer ${credential}` } : {}),
  };
}

export async function registerUniversalSystem(input: UniversalSystemRegistration) {
  const [row] = await db.insert(internalCapabilityService).values({
    serviceId: input.systemId,
    displayName: input.displayName,
    category: input.category,
    baseUrl: input.baseUrl.replace(/\/$/, ""),
    apiVersion: input.apiVersion ?? "v1",
    healthEndpoint: input.healthEndpoint ?? "/health",
    currentHealth: "unavailable",
    failurePolicy: input.failurePolicy ?? "graceful_degradation",
    credentialEnvKey: input.credentialEnvKey ?? "",
    metrics: { capabilities: input.capabilities, universalSystemsApi: true, requestEnvelope: input.requestEnvelope ?? "contract", ...(input.credentialHeader ? { credentialHeader: input.credentialHeader } : {}) },
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: internalCapabilityService.serviceId,
    set: {
      displayName: input.displayName,
      category: input.category,
      baseUrl: input.baseUrl.replace(/\/$/, ""),
      apiVersion: input.apiVersion ?? "v1",
      healthEndpoint: input.healthEndpoint ?? "/health",
      failurePolicy: input.failurePolicy ?? "graceful_degradation",
      credentialEnvKey: input.credentialEnvKey ?? "",
      metrics: { capabilities: input.capabilities, universalSystemsApi: true, requestEnvelope: input.requestEnvelope ?? "contract", ...(input.credentialHeader ? { credentialHeader: input.credentialHeader } : {}) },
      updatedAt: new Date(),
    },
  }).returning();
  await db.insert(eventLog).values({
    eventType: "UniversalSystemRegistered",
    aggregateType: "universal_system",
    aggregateId: row.id,
    sourceRef: "universal-systems-api",
    occurredAt: new Date(),
    payload: { systemId: input.systemId, category: input.category, apiVersion: row.apiVersion, capabilities: input.capabilities },
  });
  return row;
}

export async function listUniversalSystems() {
  const rows = await db.select().from(internalCapabilityService);
  return rows.filter((row) => (row.metrics as Record<string, unknown>)?.universalSystemsApi === true);
}

export async function callUniversalSystem(systemId: string, path: string, payload: Record<string, unknown>, correlationId: string = randomUUID(), options: { method?: "GET" | "POST"; timeoutMs?: number } = {}) {
  const [system] = await db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, systemId)).limit(1);
  if (!system?.baseUrl) throw new Error("UNIVERSAL_SYSTEM_NOT_REGISTERED");
  if (!/^\/[a-zA-Z0-9._/:-]*$/.test(path)) throw new Error("UNIVERSAL_SYSTEM_PATH_INVALID");
  const metrics = (system.metrics ?? {}) as Record<string, unknown>;
  const directSystems = new Set(["cil", "cerbaseal", "replit-ai-openai", "replit-ai-anthropic", "replit-ai-gemini"]);
  const encoded = JSON.stringify(metrics.requestEnvelope === "direct" || directSystems.has(systemId) ? payload : { contract_version: system.apiVersion, correlation_id: correlationId, payload });
  const credential = system.credentialEnvKey ? process.env[system.credentialEnvKey] : undefined;
  const controller = new AbortController();
  const method = options.method ?? "POST";
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetch(`${system.baseUrl}${path}`, { method, headers: headers(method === "GET" ? "" : encoded, system.serviceId, credential, correlationId, metrics), ...(method === "GET" ? {} : { body: encoded }), signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) throw new Error("UNIVERSAL_SYSTEM_NON_JSON_RESPONSE");
    const result = await response.json();
    await db.update(internalCapabilityService).set({ currentHealth: "healthy", lastCallAt: new Date(), lastHealthCheck: new Date(), updatedAt: new Date() }).where(eq(internalCapabilityService.id, system.id));
    await db.insert(eventLog).values({ eventType: "UniversalSystemCallCompleted", aggregateType: "universal_system", aggregateId: system.id, correlationId, sourceRef: "universal-systems-api", occurredAt: new Date(), payload: { systemId, path } });
    return { systemId, correlationId, result };
  } catch (error) {
    await db.update(internalCapabilityService).set({ currentHealth: "degraded", lastHealthCheck: new Date(), updatedAt: new Date(), metrics: { ...(system.metrics as Record<string, unknown>), lastError: String(error) } }).where(eq(internalCapabilityService.id, system.id));
    await db.insert(eventLog).values({ eventType: "UniversalSystemCallFailed", aggregateType: "universal_system", aggregateId: system.id, correlationId, sourceRef: "universal-systems-api", occurredAt: new Date(), payload: { systemId, path, error: String(error) } });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}