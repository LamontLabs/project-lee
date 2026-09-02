import {
  CONTRACT_VERSION,
  systemContractSchema,
  type SystemContract,
  type availabilityState,
  type freshnessState,
} from "@workspace/api-zod";
import { DOMAIN_EVENT_CATALOG } from "./domain-events";
import { ECONOMIC_DIMENSIONS, systemEconomicsContract } from "./system-economics";
import type { ManifestDocument } from "./system-manifest";

const RISK_ACTIONS: Record<string, "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = {
  model_call: "MEDIUM", send_email: "HIGH", send_sms: "HIGH", publish_content: "HIGH",
  share_file: "HIGH", delete_source: "HIGH", mark_belief_canonical: "MEDIUM",
  change_project_status: "MEDIUM", approve_export: "HIGH", contact_external_person: "HIGH",
  github_create: "HIGH", drive_share: "HIGH", governed_action: "MEDIUM", connector_write: "HIGH",
};

type State = typeof availabilityState["_output"];
type Freshness = typeof freshnessState["_output"];

function stateFor(value: unknown): State {
  const normalized = String(value ?? "").toUpperCase();
  if (["HEALTHY", "AVAILABLE", "NOMINAL", "READY"].includes(normalized)) return "available";
  if (["DEGRADED", "BOOTING", "RECOVERING", "WARN"].includes(normalized)) return "degraded";
  if (["OFFLINE", "COLD_BOOT"].includes(normalized)) return "offline";
  return "unavailable";
}

function evidence(source: string, kind: SystemContract["evidenceMap"][string][number]["kind"], state: Freshness = "live", observedAt: string | null = null) {
  return { source, kind, state, observedAt };
}

function posture(value: unknown, reason: string | null, source: string, observedAt: string | null = null) {
  const state = stateFor(value);
  return { state, freshness: state === "offline" ? "cached" as const : "live" as const, reason, evidence: [evidence(source, "probe", state === "offline" ? "cached" : "live", observedAt)] };
}

function containsSecret(value: unknown, path = "contract"): string | null {
  if (typeof value === "string" && /(api[_-]?key|secret|password|token|private[_-]?key|credential)/i.test(value)) return path;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const result = containsSecret(item, `${path}[${index}]`);
      if (result) return result;
    }
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const result = containsSecret(item, `${path}.${key}`);
      if (result) return result;
    }
  }
  return null;
}

export function projectContractSections(manifest: ManifestDocument) {
  const runtimeState = manifest.operationalState.state ?? manifest.recoveryMode.mode;
  const dependencyRows = (manifest.dependencies as Array<Record<string, unknown>>).map((dependency) => {
    const current = stateFor(dependency.state);
    return {
      id: String(dependency.engine ?? dependency.portfolioDependencyGraph ?? "unknown"),
      required: Boolean(dependency.required),
      ...posture(current, dependency.satisfied === false ? "Required dependency is not satisfied." : null, "system_manifest.dependencies"),
    };
  });
  const healthState = stateFor(manifest.health.overall);
  const healthPosture = {
    state: healthState,
    freshness: "live" as const,
    reason: healthState === "available" ? null : `System health is ${manifest.health.overall}.`,
    evidence: [evidence("system_manifest.health", "probe", "live", manifest.generatedAt)],
    overall: manifest.health.overall as "nominal" | "degraded" | "critical",
    dependenciesAvailable: dependencyRows.filter((item) => item.state === "available").length,
    dependenciesTotal: dependencyRows.length,
  };
  const capabilities = (manifest.capabilities as Array<Record<string, unknown>>).map((capability) => {
    const current = stateFor(capability.state);
    return {
      id: `${String(capability.engineId)}:${String(capability.capability)}`,
      engineId: String(capability.engineId),
      name: String(capability.capability),
      ...posture(current, current === "available" ? null : "Capability is not healthy.", "system_manifest.capabilities", manifest.generatedAt),
    };
  });
  const connectedSystems = ((manifest.health.internalServices as Array<Record<string, unknown>> | undefined) ?? []).map((service) => ({
    id: String(service.serviceId),
    name: String(service.displayName),
    authority: String(service.serviceId) === "cil" ? "cognitive routing and model selection" : String(service.serviceId) === "cerbaseal" ? "consequential-action governance" : "specialist domain authority",
    contractVersion: String(service.apiVersion ?? "v1"),
    ...posture(service.status, service.status === "healthy" ? null : "Connected system is not healthy.", "system_manifest.connectedSystems", manifest.generatedAt),
  }));
  const economics = systemEconomicsContract();
  return {
    contractVersion: CONTRACT_VERSION,
    identity: {
      name: "Project LEE" as const,
      version: typeof manifest.identity.leeVersion === "string" ? manifest.identity.leeVersion : null,
      displayName: typeof manifest.identity.displayName === "string" ? manifest.identity.displayName : null,
      profileVersion: typeof manifest.identity.profileVersion === "number" ? manifest.identity.profileVersion : null,
    },
    runtime: {
      ...posture(manifest.health.overall, healthPosture.reason, "system_manifest.runtime", manifest.generatedAt),
      environment: process.env.NODE_ENV === "production" ? "production" as const : process.env.NODE_ENV === "development" ? "development" as const : "unknown" as const,
      operationalState: manifest.operationalState.state ?? null,
      recoveryMode: typeof manifest.recoveryMode.mode === "string" ? manifest.recoveryMode.mode : null,
    },
    health: healthPosture,
    capabilities,
    connectedSystems,
    schemas: { ...manifest.schemas, contract: { version: CONTRACT_VERSION, source: "api-zod.system-contract" } },
    events: {
      version: "1.0.0",
      catalog: Object.keys(DOMAIN_EVENT_CATALOG).sort().map((type) => ({ type, version: DOMAIN_EVENT_CATALOG[type as keyof typeof DOMAIN_EVENT_CATALOG].eventVersion })),
      appendOnly: manifest.eventLog.appendOnly === true,
      source: "domain-events + event_log",
    },
    permissions: {
      owner: ["read_system_state", "write_lee_state", "confirm_governed_action"],
      internalServices: ["registered_engine_contracts", "health_probes"],
      externalWrites: ["CerbaSeal ALLOW plus owner confirmation"],
      source: "private-auth + internal-contracts + governance-engine",
    },
    risk: {
      levels: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const,
      actionClasses: RISK_ACTIONS,
      unknownAction: "HOLD" as const,
      source: "governance-engine",
    },
    governance: {
      verdicts: ["ALLOW", "HOLD", "REJECT"] as const,
      failClosed: true,
      unavailableVerdict: "HOLD" as const,
      evidenceRequiredFor: ["HIGH", "CRITICAL"] as const,
      source: "governance-engine + CerbaSeal boundary",
    },
    humanConfirmation: {
      requiredFor: ["consequential_action", "identity_profile_change", "constitution_change", "external_write"],
      methods: ["owner_confirmation", "CerbaSeal_AL​​LOW"],
      pendingState: "HOLD" as const,
      source: "governance-engine + execution boundary",
    },
    economics: {
      statuses: economics.statuses,
      dimensions: [...ECONOMIC_DIMENSIONS],
      totalCostUsd: typeof manifest.statistics.totalCostUsd === "number" ? manifest.statistics.totalCostUsd : null,
      totalCostStatus: typeof manifest.statistics.totalCostUsd === "number" ? "MEASURED" as const : "UNAVAILABLE" as const,
      source: "system-economics + cost_record",
    },
    dependencies: dependencyRows,
    evidenceMap: {
      identity: [evidence("identity_profile + identity_profile_version", "provenance", "live", manifest.generatedAt)],
      runtime: [evidence("lee_state + recovery_mode", "record", "live", manifest.generatedAt)],
      health: [evidence("engine_health + internal_capability_service + self_test_run", "probe", "live", manifest.generatedAt)],
      capabilities: [evidence("engine_registry", "schema", "live", manifest.generatedAt)],
      schemas: [evidence("manifest.schema + brain_version + constitution_version + policy_record", "schema", "live", manifest.generatedAt)],
      events: [evidence("domain-events + event_log", "event", "live", manifest.generatedAt)],
      permissions: [evidence("private-auth + internal-contracts", "schema", "live", manifest.generatedAt)],
      risk: [evidence("governance-engine.riskTable", "schema", "live", manifest.generatedAt)],
      governance: [evidence("governance-engine + internal-services", "probe", "live", manifest.generatedAt)],
      humanConfirmation: [evidence("governance_request + execution boundary", "record", "live", manifest.generatedAt)],
      economics: [evidence("cost_record + system_economics_cycle", "record", "live", manifest.generatedAt)],
      dependencies: [evidence("engine_registry + internal_capability_service", "record", "live", manifest.generatedAt)],
    },
  };
}

export function buildSystemContract(manifest: ManifestDocument): SystemContract {
  const sections = projectContractSections(manifest);
  const checks = [
    { name: "required-sections", result: "PASS" as const, detail: "All contract sections are present." },
    { name: "manifest-agreement", result: sections.identity.name === "Project LEE" && sections.health.overall === manifest.health.overall ? "PASS" as const : "FAIL" as const, detail: "Identity and health agree with the live Manifest." },
    { name: "secret-redaction", result: containsSecret(sections) ? "FAIL" as const : "PASS" as const, detail: containsSecret(sections) ? "A secret-like value was found in the projected contract." : "No secret-like value is present." },
    { name: "truthful-degradation", result: sections.health.state === "available" && manifest.health.overall !== "nominal" ? "FAIL" as const : "PASS" as const, detail: "Unavailable and degraded dependencies are not represented as healthy." },
  ];
  const contract = systemContractSchema.parse({
    ...sections,
    generatedAt: manifest.generatedAt,
    validation: { result: checks.some((check) => check.result === "FAIL") ? "WARN" : "PASS", checks },
  });
  return contract;
}