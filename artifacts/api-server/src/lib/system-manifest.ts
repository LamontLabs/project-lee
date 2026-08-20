import { desc, sql } from "drizzle-orm";
import {
  assumptionLedger, backupArchive, connector, constitutionProvision, costRecord, db, engineRegistry, eventLog,
  factLedger, interpretationLedger, manifestSnapshot, modelRouteDecision, person, policyRecord, semanticIndex,
  selfTestRun, sourceVault, universalObject, leeState, internalCapabilityService, executiveLoop,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";

export const MANIFEST_VERSION = "1.0.0";
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export type ManifestDocument = {
  manifestVersion: string; generatedAt: string; identity: Record<string, unknown>; constitution: Record<string, unknown>;
  policies: unknown[]; brainState: Record<string, unknown>; capabilities: unknown[]; connectors: unknown[];
  schemas: Record<string, unknown>; indexes: Record<string, unknown>; statistics: Record<string, unknown>;
  storage: Record<string, unknown>; health: Record<string, unknown>; dependencies: unknown[];
};

export function manifestMarkdown(manifest: ManifestDocument) {
  const lines = [`# Lee System Manifest`, ``, `- Manifest version: ${manifest.manifestVersion}`, `- Generated at: ${manifest.generatedAt}`, ``];
  for (const [key, value] of Object.entries(manifest)) {
    if (["manifestVersion", "generatedAt"].includes(key)) continue;
    lines.push(`## ${key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}`, ``, "```json", JSON.stringify(value, null, 2), "```", "");
  }
  return lines.join("\n");
}

export async function generateManifest() {
  const generatedAt = new Date();
  const [objects, facts, interpretations, people, assumptions, sources, events, engines, connectors, policies, provisions, indexes, backups, costs, routes, tests, states, internalServices, loops] = await Promise.all([
    db.select().from(universalObject), db.select().from(factLedger), db.select().from(interpretationLedger), db.select().from(person),
    db.select().from(assumptionLedger), db.select().from(sourceVault), db.select().from(eventLog), db.select().from(engineRegistry),
    db.select().from(connector), db.select().from(policyRecord), db.select().from(constitutionProvision), db.select().from(semanticIndex),
    db.select().from(backupArchive).orderBy(desc(backupArchive.createdAt)), db.select().from(costRecord), db.select().from(modelRouteDecision),
    db.select().from(selfTestRun).orderBy(desc(selfTestRun.startedAt)), db.select().from(leeState).limit(1), db.select().from(internalCapabilityService), db.select().from(executiveLoop),
  ]);
  const counts = { universalObjects: objects.length, facts: facts.length, interpretations: interpretations.length, projects: objects.filter((x) => x.objectType === "project").length, people: people.length, assumptions: assumptions.length, sources: sources.length, events: events.length };
  const allDates = [...objects, ...facts, ...interpretations, ...people, ...assumptions].map((row: any) => row.createdAt).filter(Boolean).map((value) => new Date(value).getTime());
  const manifest: ManifestDocument = {
    manifestVersion: MANIFEST_VERSION, generatedAt: generatedAt.toISOString(),
    identity: { leeVersion: process.env.LEE_VERSION ?? "0.1.0", brainVersion: backups[0]?.brainVersion ?? "unversioned", owner: "private owner" },
    constitution: { version: "active", absolute: provisions.filter((x) => x.tier === "ABSOLUTE").length, configurable: provisions.filter((x) => x.tier === "CONFIGURABLE").length, pendingAmendments: 0 },
    policies: policies.map((policy) => ({ key: policy.policyType, version: policy.version, updatedAt: iso(policy.createdAt), values: policy.values })),
    brainState: { counts, oldestObjectAt: allDates.length ? new Date(Math.min(...allDates)).toISOString() : null, newestObjectAt: allDates.length ? new Date(Math.max(...allDates)).toISOString() : null, memoryTiers: Object.fromEntries([...new Set(objects.map((x) => x.memoryTier))].map((tier) => [tier, objects.filter((x) => x.memoryTier === tier).length])) },
    capabilities: engines.map((engine) => ({ id: engine.engineId, name: engine.name, state: engine.lifecycleState, version: engine.version, owner: engine.owner, degradedCapabilities: engine.degradedCapabilities, recoveryPolicy: engine.recoveryPolicy, dependencies: engine.dependencies })),
    connectors: connectors.map((item) => ({ provider: item.provider, status: item.status, lastSyncedAt: iso(item.lastSyncAt), objectsIngested: item.eventCount, quotaState: item.configuration?.quotaState ?? "unknown" })),
    schemas: { database: "PostgreSQL", brainComponents: { memory: "1.0", knowledgeGraph: "1.0", constitution: "1.0", policies: "1.0", semanticIndex: "1.0" } },
    indexes: { semantic: { coverage: indexes.length, lastIndexedAt: indexes.length ? iso(indexes.reduce((latest, row) => row.indexedAt > latest ? row.indexedAt : latest, indexes[0].indexedAt)) : null, model: indexes[0]?.modelVersion ?? null }, queryCache: { size: 0, hitRate24h: null } },
    statistics: { modelCalls30d: routes.length, totalCostUsd: costs.reduce((sum, row) => sum + Number(row.estimatedCostUsd ?? 0), 0), briefsGenerated: 0, curiosityItemsCreated: 0, governanceResolved: 0, selfTest: tests[0] ? { result: tests[0].overallResult, at: iso(tests[0].startedAt) } : null },
    storage: { databaseRows: counts, databaseMb: null, backups: backups.length, lastBackupAgeDays: backups[0] ? (Date.now() - new Date(backups[0].createdAt).getTime()) / 86400000 : null, brainVersion: backups[0]?.brainVersion ?? null },
    health: { state: states[0]?.currentState ?? "Idle", overall: "nominal", criticalAlerts: 0, warnAlerts: 0, lastSelfTest: tests[0] ? { result: tests[0].overallResult, at: iso(tests[0].startedAt) } : null, executiveLoop: loops[0] ? { phase: loops[0].phase, cycleCount: loops[0].cycleCount, averageCycleDurationMs: loops[0].averageCycleDurationMs, interrupted: loops[0].interrupted } : null, internalServices: internalServices.map((service) => ({ serviceId: service.serviceId, category: service.category, currentHealth: service.currentHealth, failurePolicy: service.failurePolicy, lastHealthCheck: iso(service.lastHealthCheck), credentialEnvKey: service.credentialEnvKey })) },
    dependencies: [...engines.map((engine) => ({ engine: engine.engineId, required: engine.dependencies, satisfied: engine.lifecycleState !== "UNAVAILABLE" })), ...internalServices.map((service) => ({ engine: service.serviceId, required: [], satisfied: service.currentHealth === "healthy" || service.currentHealth === "degraded" }))],
  };
  await emitEvent({ eventType: "ManifestGenerated", aggregateType: "system_manifest", aggregateId: "system", payload: { manifestVersion: MANIFEST_VERSION, overallHealth: manifest.health.overall } });
  return manifest;
}
export async function saveManifestSnapshot(manifest: ManifestDocument) {
  const markdown = manifestMarkdown(manifest);
  return db.insert(manifestSnapshot).values({ manifestVersion: manifest.manifestVersion, generatedAt: new Date(manifest.generatedAt), manifest: manifest as any, markdown, expiresAt: new Date(Date.now() + 86400000) }).returning();
}