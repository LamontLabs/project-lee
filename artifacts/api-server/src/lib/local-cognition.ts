import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { costRecord, db, economicUsageRecord, internalCapabilityService } from "@workspace/db";
import { getResourceState } from "./resource";
import { emitEvent } from "./foundation-events";
import { callUniversalSystem } from "./universal-systems";
import type { ChatMessage, CILSelectedModelRoute, ProviderResult } from "./ai-providers";

export const LOCAL_BACKGROUND_WORKLOADS = [
  "consolidation",
  "summarization",
  "classification",
  "extraction",
  "contradiction_screening",
  "project_state_analysis",
  "reflection",
  "knowledge_gap_review",
  "objective_reconciliation",
  "briefing_preparation",
] as const;

export type LocalBackgroundWorkload = typeof LOCAL_BACKGROUND_WORKLOADS[number];
export type LocalRuntimeId = "ollama" | "llama_cpp" | "whisper_cpp";
export type LocalAvailability = "available" | "degraded" | "unavailable";
export type LocalFreshness = "current" | "degraded" | "unverified";

export type LocalRuntimeDestination = {
  runtimeId: LocalRuntimeId;
  provider: string;
  displayName: string;
  capabilities: string[];
  privacy: "local_only";
  status: "registered" | "not_installed";
};

export type LocalRuntimeAdapter = {
  destination: LocalRuntimeDestination;
  getModelInventory: (correlationId?: string, signal?: AbortSignal) => Promise<unknown>;
  execute: (route: CILSelectedModelRoute, messages: ChatMessage[], correlationId: string, workloadClass?: string, signal?: AbortSignal) => Promise<ProviderResult>;
};

export const LOCAL_RUNTIME_DESTINATIONS: readonly LocalRuntimeDestination[] = [
  { runtimeId: "ollama", provider: "ollama", displayName: "Ollama Local K6 Runtime", capabilities: ["chat", "model_inventory", "approved_background_workloads"], privacy: "local_only", status: "registered" },
  { runtimeId: "llama_cpp", provider: "llama.cpp", displayName: "llama.cpp Local K6 Runtime", capabilities: ["text_generation"], privacy: "local_only", status: "not_installed" },
  { runtimeId: "whisper_cpp", provider: "whisper.cpp", displayName: "whisper.cpp Local K6 Runtime", capabilities: ["speech_to_text"], privacy: "local_only", status: "not_installed" },
];

export type LocalResourceLimits = {
  maxInputCharacters: number;
  maxOutputTokens: number;
  maxContextTokens: number;
  timeoutMs: number;
};

export type LocalExecutionEvidence = {
  routeAuthority: "cil";
  runtime: "ollama";
  runtimeId: "ollama";
  provider: "ollama";
  destination: "local_k6";
  routeId: string;
  workloadClass: string;
  privacy: "local_only";
  availability: LocalAvailability;
  freshness: LocalFreshness;
  resourceLimits: LocalResourceLimits;
  resourceState: string;
  inventoryObservedAt: string | null;
  degradedReason?: string;
  ledger?: {
    eventId: string;
    costRecordId: string;
    usageRecordId: string;
  };
};

type OllamaInventoryModel = {
  name: string;
  size?: number;
  modifiedAt?: string;
  details?: Record<string, unknown>;
};

type OllamaInventory = {
  observedAt: string;
  models: OllamaInventoryModel[];
};

const registration = { current: undefined as Promise<unknown> | undefined };

function numberEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function localResourceLimits(constrained = false): LocalResourceLimits {
  const maxOutputTokens = numberEnv("LEE_LOCAL_MAX_OUTPUT_TOKENS", 1024, 64, 4096);
  return {
    maxInputCharacters: numberEnv("LEE_LOCAL_MAX_INPUT_CHARACTERS", 24_000, 1_000, 200_000),
    maxOutputTokens: constrained
      ? Math.min(maxOutputTokens, numberEnv("LEE_LOCAL_CONSTRAINED_OUTPUT_TOKENS", 256, 32, maxOutputTokens))
      : maxOutputTokens,
    maxContextTokens: numberEnv("LEE_LOCAL_MAX_CONTEXT_TOKENS", 4096, 256, 16_384),
    timeoutMs: numberEnv("LEE_LOCAL_TIMEOUT_MS", 30_000, 1_000, 120_000),
  };
}

export function isApprovedLocalWorkload(value: unknown): value is LocalBackgroundWorkload {
  return typeof value === "string" && (LOCAL_BACKGROUND_WORKLOADS as readonly string[]).includes(value);
}

async function ensureOllamaRegistration() {
  registration.current ??= import("../services/internal-services").then(({ registerInternalServices }) => registerInternalServices());
  await registration.current;
}

function resourceStateName(value: unknown) {
  return value === "CRITICAL" || value === "CONSTRAINED" || value === "HEALTHY" ? value : "UNVERIFIED";
}

async function setOllamaHealth(health: "healthy" | "degraded" | "unavailable", metrics: Record<string, unknown>) {
  const [service] = await db.select({ id: internalCapabilityService.id }).from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, "ollama")).limit(1);
  if (service) await db.update(internalCapabilityService).set({ currentHealth: health, lastHealthCheck: new Date(), updatedAt: new Date(), metrics }).where(eq(internalCapabilityService.id, service.id));
}

export async function getOllamaStatus() {
  const [service] = await db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, "ollama")).limit(1);
  const metrics = (service?.metrics ?? {}) as Record<string, unknown>;
  return {
  runtime: "ollama" as const,
  runtimeId: "ollama" as const,
  provider: "ollama",
    configured: Boolean(service?.baseUrl),
    enabled: process.env.LEE_LOCAL_COGNITION_ENABLED !== "false",
    baseUrl: service?.baseUrl ?? null,
    health: service?.currentHealth ?? "unavailable",
    lastHealthCheck: service?.lastHealthCheck ?? null,
    capabilities: Array.isArray(metrics.capabilities) ? metrics.capabilities : ["chat", "model_inventory", "approved_background_workloads"],
    privacy: "local_only" as const,
    modelInventory: metrics.lastModelInventory ?? null,
    resourcePolicy: {
      maxInputCharacters: localResourceLimits().maxInputCharacters,
      maxOutputTokens: localResourceLimits().maxOutputTokens,
      maxContextTokens: localResourceLimits().maxContextTokens,
    },
  };
}

export async function getOllamaModelInventory(correlationId: string = randomUUID(), signal?: AbortSignal): Promise<OllamaInventory> {
  await ensureOllamaRegistration();
  try {
    const response = (await callUniversalSystem("ollama", "/api/tags", {}, correlationId, { method: "GET", timeoutMs: localResourceLimits().timeoutMs, signal })).result as Record<string, unknown>;
    const models = Array.isArray(response.models) ? response.models.map((model: any) => ({
      name: String(model?.name ?? ""),
      size: typeof model?.size === "number" ? model.size : undefined,
      modifiedAt: typeof model?.modified_at === "string" ? model.modified_at : undefined,
      details: model?.details && typeof model.details === "object" ? model.details : undefined,
    })).filter((model) => model.name) : [];
    if (!models.length) throw new Error("OLLAMA_MODEL_INVENTORY_EMPTY");
    const observedAt = new Date().toISOString();
    await setOllamaHealth("healthy", { capabilities: ["chat", "model_inventory", "approved_background_workloads"], lastModelInventory: { observedAt, models: models.map((model) => ({ name: model.name, size: model.size, modifiedAt: model.modifiedAt })) } });
    return { observedAt, models };
  } catch (error) {
    if (!signal?.aborted) await setOllamaHealth("degraded", { capabilities: ["chat", "model_inventory", "approved_background_workloads"], lastError: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function modelAvailable(requested: string, inventory: OllamaInventory) {
  return inventory.models.some((model) => model.name === requested || model.name.split(":")[0] === requested);
}

export function localFailureEvidence(route: CILSelectedModelRoute, workloadClass: string, reason: string): LocalExecutionEvidence {
  const limits = localResourceLimits();
  return {
    routeAuthority: "cil",
    runtime: "ollama",
    runtimeId: "ollama",
    provider: "ollama",
    destination: "local_k6",
    routeId: route.routeId,
    workloadClass,
    privacy: "local_only",
    availability: "unavailable",
    freshness: "unverified",
    resourceLimits: limits,
    resourceState: "UNVERIFIED",
    inventoryObservedAt: null,
    degradedReason: reason,
  };
}

export async function callOllama(route: CILSelectedModelRoute, messages: ChatMessage[], correlationId: string, workloadClass = "unclassified", signal?: AbortSignal): Promise<ProviderResult> {
  if (!isApprovedLocalWorkload(workloadClass)) throw new Error("LOCAL_WORKLOAD_NOT_APPROVED");
  if (process.env.LEE_LOCAL_COGNITION_ENABLED === "false") throw new Error("LOCAL_COGNITION_DISABLED");
  const textSize = messages.reduce((total, message) => total + message.content.length, 0);
  const resource = await getResourceState();
  const constrained = resource.overallState === "CONSTRAINED";
  if (resource.overallState === "CRITICAL") throw new Error("LOCAL_RESOURCE_CRITICAL");
  const limits = localResourceLimits(constrained);
  if (textSize > limits.maxInputCharacters) throw new Error("LOCAL_INPUT_LIMIT_EXCEEDED");
  const inventory = await getOllamaModelInventory(correlationId, signal);
  if (!modelAvailable(route.model, inventory)) throw new Error(`OLLAMA_MODEL_UNAVAILABLE:${route.model}`);
  const body = {
    model: route.model,
    messages,
    stream: false,
    options: { num_predict: limits.maxOutputTokens, num_ctx: limits.maxContextTokens },
  };
  try {
    const response = (await callUniversalSystem("ollama", "/api/chat", body, correlationId, { timeoutMs: limits.timeoutMs, signal })).result as Record<string, any>;
    const text = String(response.message?.content ?? "").trim();
    if (!text) throw new Error("OLLAMA_EMPTY_RESPONSE");
    const tokensIn = Number(response.prompt_eval_count ?? Math.ceil(textSize / 4));
    const tokensOut = Number(response.eval_count ?? Math.ceil(text.length / 4));
    const localExecution: LocalExecutionEvidence = {
      routeAuthority: "cil",
      runtime: "ollama",
      runtimeId: "ollama",
      provider: "ollama",
      destination: "local_k6",
      routeId: route.routeId,
      workloadClass,
      privacy: "local_only",
      availability: "available",
      freshness: constrained ? "degraded" : "current",
      resourceLimits: limits,
      resourceState: resourceStateName(resource.overallState),
      inventoryObservedAt: inventory.observedAt,
      ...(constrained ? { degradedReason: "Resource Engine reported constrained capacity; local output was bounded." } : {}),
    };
    return { text, tokensIn, tokensOut, provider: "ollama", model: route.model, routeId: route.routeId, estimatedCostUsd: 0, localExecution };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (!signal?.aborted) await setOllamaHealth("degraded", { capabilities: ["chat", "model_inventory", "approved_background_workloads"], lastError: reason });
    throw Object.assign(new Error(reason), { localExecution: localFailureEvidence(route, workloadClass, reason) });
  }
}

export async function recordLocalCognitionRun(input: {
  correlationId: string;
  route: CILSelectedModelRoute;
  workloadClass: string;
  outcome: "completed" | "failed";
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  evidence: LocalExecutionEvidence;
  error?: string;
}) {
  const eventType = input.outcome === "completed" ? "LocalCognitionRunCompleted" : "LocalCognitionRunFailed";
  return db.transaction(async (tx) => {
    const event = await emitEvent({
      eventType,
      aggregateType: "local_cognition_run",
      aggregateId: input.correlationId,
      sourceRef: "model-router",
      correlationId: input.correlationId,
      payload: {
        routeAuthority: "cil",
    runtime: "ollama",
    runtimeId: "ollama",
    provider: "ollama",
        routeId: input.route.routeId,
        model: input.route.model,
        workloadClass: input.workloadClass,
        outcome: input.outcome,
        error: input.error,
        evidence: input.evidence,
      },
    }, tx);
    const totalTokens = input.promptTokens + input.completionTokens;
    const [cost] = await tx.insert(costRecord).values({
      correlationId: input.correlationId,
      engine: "model-router",
      provider: "ollama",
      tier: "LOCAL",
      model: input.route.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      latencyMs: input.latencyMs,
      cacheHit: false,
      metadata: { routeAuthority: "cil", runtime: "ollama", workloadClass: input.workloadClass, outcome: input.outcome, resourceState: input.evidence.resourceState, privacy: "local_only", error: input.error },
    }).returning();
    const [usage] = await tx.insert(economicUsageRecord).values({
      operation: "local_cognition",
      category: "model_inference",
      quantity: totalTokens,
      unit: "tokens",
      provider: "ollama",
      sourceRef: cost.id,
      evidenceRef: `event:${event.id}`,
      metadata: { correlationId: input.correlationId, model: input.route.model, workloadClass: input.workloadClass, outcome: input.outcome, routeAuthority: "cil", resourceState: input.evidence.resourceState },
    }).returning();
    return { eventId: event.id, costRecordId: cost.id, usageRecordId: usage.id };
  });
}

export async function recordLocalCognitionBlocked(input: { correlationId: string; route: CILSelectedModelRoute; workloadClass?: string; reason: string }) {
  return emitEvent({
    eventType: "LocalCognitionBlocked",
    aggregateType: "local_cognition_run",
    aggregateId: input.correlationId,
    sourceRef: "model-router",
    correlationId: input.correlationId,
    payload: { routeAuthority: "cil", runtime: "ollama", routeId: input.route.routeId, model: input.route.model, workloadClass: input.workloadClass ?? null, reason: input.reason },
  });
}