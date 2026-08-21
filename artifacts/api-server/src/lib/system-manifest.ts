import { desc, eq, isNull, sql } from "drizzle-orm";
import {
  assumptionLedger, backupArchive, connector, constitutionProvision, constitutionVersion, costRecord, db, engineHealth, engineRegistry, eventLog,
  factLedger, graphEdge, graphNode, identityProfile, identityProfileVersion, interpretationLedger, manifestSnapshot, modelRouteDecision, person, policyRecord, providerRegistration, semanticIndex,
  operationalCapacity,
  strategicAnchor,
  selfTestRun, sourceVault, universalObject, leeState, internalCapabilityService, executiveLoop, brainVersion,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { getPortfolioDependencyGraph } from "./portfolio-dependency";
import { getRecoveryMode } from "./recovery-modes";
import { projectContractSections } from "./system-contract";

export const MANIFEST_VERSION = "1.0.0";
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;
const unavailable = (reason: string) => ({ status: "unavailable", reason, value: null });

export type ManifestDocument = {
  manifestVersion: string; generatedAt: string; identity: Record<string, unknown>; constitution: Record<string, unknown>;
  policies: unknown[]; brainState: Record<string, unknown>; capabilities: unknown[]; engines: unknown[]; engineHealth: unknown[]; connectors: unknown[]; providers: unknown[];
  schemas: Record<string, unknown>; indexes: Record<string, unknown>; statistics: Record<string, unknown>;
  semanticIndex: Record<string, unknown>; knowledge: Record<string, unknown>; eventLog: Record<string, unknown>; graph: Record<string, unknown>;
  storage: Record<string, unknown>; latestBackup: Record<string, unknown>; latestRestoreVerification: Record<string, unknown>; selfTest: Record<string, unknown>;
  recoveryMode: Record<string, unknown>; operationalState: Record<string, unknown>; health: Record<string, unknown>; dependencies: unknown[]; provenance: Record<string, string>;
  validation: { result: "PASS" | "WARN"; checks: Array<{ name: string; result: "PASS" | "WARN"; evidence: Record<string, unknown> }> };
  contractVersion: string; runtime: Record<string, unknown>; events: Record<string, unknown>; permissions: Record<string, unknown>;
  risk: Record<string, unknown>; governance: Record<string, unknown>; humanConfirmation: Record<string, unknown>;
  economics: Record<string, unknown>; evidenceMap: Record<string, unknown>;
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
  const [objects, facts, interpretations, people, assumptions, sources, events, engines, engineHealthRows, connectors, providers, policies, provisions, constitutionVersions, indexes, backups, costs, routes, tests, states, internalServices, loops, capacities, anchors, profiles, profileVersions, brainVersions, graphNodes, graphEdges] = await Promise.all([
    db.select().from(universalObject), db.select().from(factLedger), db.select().from(interpretationLedger), db.select().from(person),
    db.select().from(assumptionLedger), db.select().from(sourceVault), db.select().from(eventLog), db.select().from(engineRegistry),
    db.select().from(engineHealth), db.select().from(connector), db.select().from(providerRegistration), db.select().from(policyRecord).where(isNull(policyRecord.supersededAt)), db.select().from(constitutionProvision).where(eq(constitutionProvision.active, true)), db.select().from(constitutionVersion).orderBy(desc(constitutionVersion.version)), db.select().from(semanticIndex),
    db.select().from(backupArchive).orderBy(desc(backupArchive.createdAt)), db.select().from(costRecord), db.select().from(modelRouteDecision),
    db.select().from(selfTestRun).orderBy(desc(selfTestRun.startedAt)), db.select().from(leeState).limit(1), db.select().from(internalCapabilityService), db.select().from(executiveLoop), db.select().from(operationalCapacity).orderBy(desc(operationalCapacity.observedAt)).limit(1),
    db.select().from(strategicAnchor).where(eq(strategicAnchor.active, true)).orderBy(desc(strategicAnchor.createdAt)),
    db.select().from(identityProfile), db.select().from(identityProfileVersion).orderBy(desc(identityProfileVersion.version)), db.select().from(brainVersion).orderBy(desc(brainVersion.createdAt)), db.select().from(graphNode), db.select().from(graphEdge),
  ]);
  const latestProfile = profiles[0];
  const latestProfileVersion = profileVersions.find((item) => item.profileId === latestProfile?.id);
  const latestBrain = brainVersions[0];
  const latestBackup = backups[0];
  const latestRestore = backups.find((backup) => backup.restoreTestedAt || backup.restoreTestStatus);
  const latestConstitution = constitutionVersions[0];
  const activeServices = internalServices.map((service) => ({ serviceId: service.serviceId, displayName: service.displayName, category: service.category, health: service.currentHealth, apiVersion: service.apiVersion, lastHealthCheck: iso(service.lastHealthCheck), failurePolicy: service.failurePolicy }));
  const serviceHealth = Object.fromEntries(internalServices.map((service) => [service.serviceId, { status: service.currentHealth, checkedAt: iso(service.lastHealthCheck), failurePolicy: service.failurePolicy }]));
  const engineHealthByName = new Map(engineHealthRows.map((health) => [health.engineName, health]));
  const counts = { universalObjects: objects.length, facts: facts.length, interpretations: interpretations.length, projects: objects.filter((x) => x.objectType === "project").length, people: people.length, assumptions: assumptions.length, sources: sources.length, events: events.length };
  const allDates = [...objects, ...facts, ...interpretations, ...people, ...assumptions, ...events].map((row: any) => row.createdAt ?? row.occurredAt).filter(Boolean).map((value) => new Date(value).getTime());
  const dependencyGraph = await getPortfolioDependencyGraph();
  const recovery = getRecoveryMode();
  const latestSelfTest = tests[0];
  const failedEngine = engines.some((engine) => ["UNAVAILABLE", "FAILED"].includes(engine.lifecycleState)) || engines.some((engine) => ["UNAVAILABLE", "FAILED"].includes(engine.status));
  const unavailableService = internalServices.some((service) => service.currentHealth === "unavailable");
  const overallHealth = latestSelfTest?.overallResult === "FAIL" || failedEngine ? "critical" : unavailableService || latestSelfTest?.overallResult === "WARN" ? "degraded" : "nominal";
  const graphStats = { nodeCount: graphNodes.length, edgeCount: graphEdges.length, portfolio: dependencyGraph.summary };
  const validationChecks: ManifestDocument["validation"]["checks"] = [
    { name: "knowledge-counts", result: "PASS", evidence: { universalObjects: objects.length, facts: facts.length, interpretations: interpretations.length, sources: sources.length, events: events.length } },
    { name: "identity-profile-version", result: latestProfile && latestProfileVersion ? "PASS" : "WARN", evidence: { profileId: latestProfile?.id ?? null, profileVersion: latestProfileVersion?.version ?? null } },
    { name: "brain-version", result: latestBrain ? "PASS" : "WARN", evidence: { version: latestBrain?.versionName ?? null, checksum: latestBrain?.checksum ?? null } },
    { name: "graph-counts", result: "PASS", evidence: graphStats },
    { name: "backup-restore-linkage", result: latestBackup ? "PASS" : "WARN", evidence: { backupId: latestBackup?.backupId ?? null, restoreTestStatus: latestRestore?.restoreTestStatus ?? null } },
    { name: "health-source", result: engines.length || internalServices.length ? "PASS" : "WARN", evidence: { engineCount: engines.length, internalServiceCount: internalServices.length, overall: overallHealth } },
  ];
  const baseManifest = {
    manifestVersion: MANIFEST_VERSION, generatedAt: generatedAt.toISOString(),
    identity: { leeVersion: process.env.LEE_VERSION ?? unavailable("LEE_VERSION is not configured").value, profileId: latestProfile?.id ?? null, profileKey: latestProfile?.profileKey ?? null, profileVersion: latestProfileVersion?.version ?? null, displayName: latestProfile?.displayName ?? null, confidence: latestProfile?.confidence ?? null },
    constitution: { version: latestConstitution?.version ?? null, activeProvisionCount: provisions.length, absolute: provisions.filter((x) => x.tier === "ABSOLUTE").length, governed: provisions.filter((x) => x.tier === "GOVERNED").length, configurable: provisions.filter((x) => x.tier === "CONFIGURABLE").length, source: latestConstitution ? "constitution_version" : "constitution_provision" },
    policies: policies.map((policy) => ({ key: policy.policyType, version: policy.version, updatedAt: iso(policy.createdAt), values: policy.values })),
    brainState: { version: latestBrain?.versionName ?? null, schemaVersion: latestBrain?.schemaVersion ?? null, status: latestBrain?.status ?? null, checksum: latestBrain?.checksum ?? null, verifiedAt: iso(latestBrain?.verifiedAt), counts, oldestObjectAt: allDates.length ? new Date(Math.min(...allDates)).toISOString() : null, newestObjectAt: allDates.length ? new Date(Math.max(...allDates)).toISOString() : null, memoryTiers: Object.fromEntries([...new Set(objects.map((x) => x.memoryTier))].map((tier) => [tier, objects.filter((x) => x.memoryTier === tier).length])) },
    engines: engines.map((engine) => ({ id: engine.engineId, name: engine.name, state: engine.lifecycleState, status: engine.status, version: engine.version, owner: engine.owner, enabled: engine.enabled, capabilities: engine.capabilities, dependencies: engine.dependencies, requiredDependencies: engine.requiredDependencies, degradedCapabilities: engine.degradedCapabilities, recoveryPolicy: engine.recoveryPolicy, lastHeartbeat: iso(engine.lastHeartbeat) })),
    engineHealth: engineHealthRows.map((health) => ({ engineName: health.engineName, lastSuccessAt: iso(health.lastSuccessAt), lastFailureAt: iso(health.lastFailureAt), errorCount: health.errorCount, runCount: health.runCount, averageDurationMs: health.averageDurationMs, backoffUntil: iso(health.backoffUntil), updatedAt: iso(health.updatedAt) })),
    capabilities: engines.flatMap((engine) => engine.capabilities.map((capability) => ({ capability, engineId: engine.engineId, state: engine.lifecycleState }))),
    connectors: connectors.map((item) => ({ provider: item.provider, status: item.status, lastSyncedAt: iso(item.lastSyncAt), objectsIngested: item.eventCount, quotaState: item.configuration?.quotaState ?? "unknown" })),
    providers: providers.map((provider) => ({ providerId: provider.providerId, category: provider.providerCategory, adapter: provider.adapterName, status: provider.currentStatus, lastSyncedAt: iso(provider.lastSyncedAt), supportedEvents: provider.supportedEvents })),
    schemas: { database: { engine: "PostgreSQL", source: "runtime" }, manifest: MANIFEST_VERSION, brain: latestBrain ? { version: latestBrain.schemaVersion, source: "brain_version" } : unavailable("No Brain Version has been recorded"), constitution: latestConstitution ? { version: latestConstitution.version, source: "constitution_version" } : unavailable("No Constitution Version has been recorded"), identityProfile: latestProfileVersion ? { version: latestProfileVersion.version, source: "identity_profile_version" } : unavailable("No Identity Profile Version has been recorded"), policies: { versions: policies.map((policy) => ({ type: policy.policyType, version: policy.version })), source: "policy_record" }, semanticIndex: { models: [...new Set(indexes.map((index) => index.modelVersion))], source: "semantic_index" } },
    indexes: { semantic: { coverage: indexes.length, stale: indexes.filter((row) => row.indexedAt < row.sourceUpdatedAt).length, lastIndexedAt: indexes.length ? iso(indexes.reduce((latest, row) => row.indexedAt > latest ? row.indexedAt : latest, indexes[0].indexedAt)) : null, model: indexes[0]?.modelVersion ?? null }, queryCache: unavailable("Query cache statistics are not persisted") },
    semanticIndex: { status: indexes.length ? "available" : "empty", recordCount: indexes.length, staleCount: indexes.filter((row) => row.indexedAt < row.sourceUpdatedAt).length, models: [...new Set(indexes.map((index) => index.modelVersion))], latestIndexedAt: indexes.length ? iso(indexes.reduce((latest, row) => row.indexedAt > latest ? row.indexedAt : latest, indexes[0].indexedAt)) : null },
    knowledge: counts,
    eventLog: { recordCount: events.length, latestEventAt: events.length ? iso(events.reduce((latest, row) => row.occurredAt > latest ? row.occurredAt : latest, events[0].occurredAt)) : null, latestEventType: events.length ? events.reduce((latest, row) => row.occurredAt > latest.occurredAt ? row : latest, events[0]).eventType : null, maxSequenceNumber: events.length ? Math.max(...events.map((event) => event.sequenceNumber)) : null, appendOnly: true, source: "event_log" },
    graph: graphStats,
    statistics: { modelCalls: routes.length, totalCostUsd: costs.reduce((sum, row) => sum + Number(row.estimatedCostUsd ?? 0), 0), activeStrategicAnchors: anchors.map((anchor) => ({ id: anchor.id, type: anchor.anchorType, summary: anchor.summary, projectId: anchor.projectId })), knowledge: counts, graph: graphStats, selfTest: latestSelfTest ? { result: latestSelfTest.overallResult, startedAt: iso(latestSelfTest.startedAt), completedAt: iso(latestSelfTest.completedAt), passCount: latestSelfTest.passCount, warnCount: latestSelfTest.warnCount, failCount: latestSelfTest.failCount } : unavailable("No Self-Test run has been recorded") },
    storage: { databaseRows: counts, databaseMb: unavailable("Database size is not exposed by the application storage contract"), backupCount: backups.length, latestBackup: latestBackup ? { backupId: latestBackup.backupId, formatVersion: latestBackup.formatVersion, brainVersion: latestBackup.brainVersion, sizeBytes: latestBackup.sizeBytes, status: latestBackup.status, encrypted: latestBackup.encrypted, createdAt: iso(latestBackup.createdAt), verifiedAt: iso(latestBackup.verifiedAt) } : unavailable("No backup has been recorded"), latestRestoreVerification: latestRestore ? { backupId: latestRestore.backupId, status: latestRestore.restoreTestStatus, testedAt: iso(latestRestore.restoreTestedAt) } : unavailable("No restore verification has been recorded") },
    latestBackup: latestBackup ? { backupId: latestBackup.backupId, formatVersion: latestBackup.formatVersion, brainVersion: latestBackup.brainVersion, status: latestBackup.status, sizeBytes: latestBackup.sizeBytes, encrypted: latestBackup.encrypted, createdAt: iso(latestBackup.createdAt), verifiedAt: iso(latestBackup.verifiedAt) } : unavailable("No backup has been recorded"),
    latestRestoreVerification: latestRestore ? { backupId: latestRestore.backupId, status: latestRestore.restoreTestStatus, testedAt: iso(latestRestore.restoreTestedAt) } : unavailable("No restore verification has been recorded"),
    selfTest: latestSelfTest ? { runId: latestSelfTest.testRunId, result: latestSelfTest.overallResult, startedAt: iso(latestSelfTest.startedAt), completedAt: iso(latestSelfTest.completedAt), passCount: latestSelfTest.passCount, warnCount: latestSelfTest.warnCount, failCount: latestSelfTest.failCount } : unavailable("No Self-Test run has been recorded"),
    recoveryMode: recovery,
    operationalState: states[0] ? { state: states[0].currentState, reason: states[0].reason, enteredAt: iso(states[0].enteredAt), updatedAt: iso(states[0].updatedAt), activeJobsSummary: states[0].activeJobsSummary } : unavailable("No operational state has been recorded"),
    health: { state: states[0]?.currentState ?? null, stateReason: states[0]?.reason ?? null, overall: overallHealth, capacity: capacities[0] ? { state: capacities[0].state, score: capacities[0].score, inferred: capacities[0].inferred } : unavailable("No operational capacity observation has been recorded"), engines: engines.map((engine) => ({ engineId: engine.engineId, lifecycleState: engine.lifecycleState, status: engine.status, lastHeartbeat: iso(engine.lastHeartbeat), health: engineHealthByName.get(engine.name) ?? null })), cil: serviceHealth.cil ?? unavailable("CIL is not registered in ServiceRegistry"), cerbaseal: serviceHealth.cerbaseal ?? unavailable("CerbaSeal is not registered in ServiceRegistry"), internalServices: activeServices, selfTest: latestSelfTest ? { result: latestSelfTest.overallResult, startedAt: iso(latestSelfTest.startedAt), completedAt: iso(latestSelfTest.completedAt) } : unavailable("No Self-Test run has been recorded"), executiveLoop: loops[0] ? { phase: loops[0].phase, cycleCount: loops[0].cycleCount, averageCycleDurationMs: loops[0].averageCycleDurationMs, interrupted: loops[0].interrupted, updatedAt: iso(loops[0].updatedAt) } : unavailable("Executive Loop has no persisted state") },
    dependencies: [...engines.map((engine) => ({ engine: engine.engineId, required: engine.requiredDependencies.length ? engine.requiredDependencies : engine.dependencies, satisfied: engine.lifecycleState !== "UNAVAILABLE", state: engine.lifecycleState })), ...internalServices.map((service) => ({ engine: service.serviceId, required: [], satisfied: ["healthy", "degraded"].includes(service.currentHealth), state: service.currentHealth })), { portfolioDependencyGraph: dependencyGraph.summary }],
    provenance: { identity: "identity_profile + identity_profile_version", brainState: "brain_version", constitution: "constitution_version + constitution_provision", policies: "policy_record", capabilities: "engine_registry", providers: "provider_registration", indexes: "semantic_index", statistics: "cost_record + model_route_decision + canonical ledgers", storage: "backup_archive", health: "engine_health + internal_capability_service + self_test_run + lee_state + executive_loop", dependencies: "engine_registry + internal_capability_service + graph_edge" },
    validation: { result: validationChecks.some((check) => check.result === "WARN") ? "WARN" : "PASS", checks: validationChecks },
  } as unknown as ManifestDocument;
  const contract = projectContractSections(baseManifest);
  const manifest: ManifestDocument = {
    ...baseManifest,
    contractVersion: contract.contractVersion,
    runtime: contract.runtime,
    events: contract.events,
    permissions: contract.permissions,
    risk: contract.risk,
    governance: contract.governance,
    humanConfirmation: contract.humanConfirmation,
    economics: contract.economics,
    evidenceMap: contract.evidenceMap,
  };
  await emitEvent({ eventType: "ManifestGenerated", aggregateType: "system_manifest", aggregateId: "system", payload: { manifestVersion: MANIFEST_VERSION, overallHealth: manifest.health.overall } });
  return manifest;
}
export async function saveManifestSnapshot(manifest: ManifestDocument) {
  const markdown = manifestMarkdown(manifest);
  return db.insert(manifestSnapshot).values({ manifestVersion: manifest.manifestVersion, generatedAt: new Date(manifest.generatedAt), manifest: manifest as any, markdown, expiresAt: new Date(Date.now() + 86400000) }).returning();
}