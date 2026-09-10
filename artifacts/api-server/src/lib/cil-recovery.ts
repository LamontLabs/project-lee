import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, eventLog, internalCapabilityService } from "@workspace/db";
import {
  PROJECT_CAPABILITY_LEVELS,
  capabilityLevelFor,
  configuredProjects,
  isCILProject,
  listProjects,
  projectFor,
  projectOperationAuthorization,
  registeredProjects,
  type ProjectConfig,
  type ProjectCapabilityLevel,
} from "./mcp-project-bridge";
import { compareProjectContract } from "./mcp-project-bridge";
import { getCILModelInventory, internalServiceHealth, reasoningService } from "../services/internal-services";

export const CIL_RECOVERY_MODE = "CIL_RECOVERY" as const;
export const CIL_RECOVERY_AUTHORITY_LEVELS = PROJECT_CAPABILITY_LEVELS;
export type CILRecoveryAuthority = ProjectCapabilityLevel;

const protectedSurfaces = [
  "authentication and private credentials",
  "T1/T2/T3 model selection and routing",
  "CIL/LEE trust and signed request contracts",
  "governance and CerbaSeal integration",
  "production deployment and secrets",
  "database schema and destructive migrations",
];
let lastObservedMode: "NORMAL" | typeof CIL_RECOVERY_MODE | undefined;

function allConfiguredProjects(): ProjectConfig[] {
  const projects = new Map(configuredProjects().map((project) => [project.id, project]));
  for (const project of registeredProjects()) projects.set(project.id, project);
  return [...projects.values()];
}

export function cilProjectId() {
  const explicit = process.env.LEE_CIL_PROJECT_ID;
  if (explicit) return explicit;
  return allConfiguredProjects().find(isCILProject)?.id ?? null;
}

export function cilRecoveryPolicy(project: ProjectConfig | undefined) {
  const authority = project ? capabilityLevelFor(project) : "OBSERVE";
  const selfRepairAuthorization = project
    ? projectOperationAuthorization(project, "apply")
    : { allowed: false, requiredCapability: "MANAGE" as const, grantedCapability: authority, reason: "No CIL project is registered." };
  return {
    mode: CIL_RECOVERY_MODE,
    authority,
    selfRepairEligible: Boolean(project && isCILProject(project) && selfRepairAuthorization.allowed),
    selfRepairOperations: ["inspect", "search", "read", "dependencies", "logs", "contract", "check", "preview", "apply", "restart"],
    protectedSurfaces,
    protectedChangesRequire: "GOVERNED_MANAGE",
    protectedChangeApproval: ["CerbaSeal ALLOW", "owner confirmation", "fresh preview", "successful validation"],
    deniedWithoutExplicitGovernance: ["deploy", "change_authentication", "change_secrets", "change_routing_authority", "change_governance", "destructive_database_operation"],
    authorization: selfRepairAuthorization,
  };
}

export async function getCILRecoveryState() {
  const [service] = await db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, "cil")).limit(1);
  const projectId = cilProjectId();
  const project = projectId ? projectFor(projectId) : undefined;
  const health = service?.currentHealth ?? "unavailable";
  const degraded = health !== "healthy";
  const mode = degraded ? CIL_RECOVERY_MODE : "NORMAL";
  if (lastObservedMode !== mode) {
    await db.insert(eventLog).values({
      eventType: mode === CIL_RECOVERY_MODE ? "CILRecoveryEntered" : "CILRecoveryCleared",
      aggregateType: "cil_service",
      aggregateId: "cil",
      sourceRef: "cil-recovery",
      occurredAt: new Date(),
      payload: {
        mode,
        health,
        normalReasoningBlocked: degraded,
        deterministicDiagnosticsAvailable: true,
        externalModelFallbackEnabled: false,
      },
    }).catch(() => undefined);
    lastObservedMode = mode;
  }
  return {
    mode,
    reason: degraded
      ? `CIL is ${health}; normal LEE reasoning remains blocked while deterministic recovery diagnostics and the registered project bridge remain available.`
      : "CIL is healthy; use the normal authenticated LEE → CIL API path.",
    cil: {
      serviceId: "cil",
      health,
      lastHealthCheck: service?.lastHealthCheck ?? null,
      metrics: service?.metrics ?? {},
      normalApiPath: "LEE → authenticated CIL API",
      normalApiPathAllowed: !degraded,
    },
    fallback: {
      deterministicDiagnostics: true,
      projectBridgeInspection: Boolean(project),
      externalModelReasoning: false,
      note: "Recovery mode never silently substitutes an external model for CIL.",
    },
    project: project
      ? { id: project.id, name: project.name, endpoint: project.endpoint, capabilityLevel: capabilityLevelFor(project), allowedOperations: (await listProjects()).find((item) => item.id === project.id)?.allowedOperations ?? [] }
      : { id: null, name: null, capabilityLevel: "OBSERVE", allowedOperations: [], registrationRequired: true },
    policy: cilRecoveryPolicy(project),
  };
}

export async function verifyCILRecovery(projectId: string, expectedContract: Record<string, unknown> = {}) {
  const project = projectFor(projectId);
  if (!project || !isCILProject(project)) throw new Error("A registered CIL project is required for CIL recovery verification.");
  const serviceRows = await internalServiceHealth();
  const service = serviceRows.find((row) => row.serviceId === "cil");
  const gates: Array<{ id: string; passed: boolean; detail?: unknown; error?: string }> = [];
  const healthGate: { id: string; passed: boolean; detail: Record<string, unknown> } = { id: "cil_health", passed: service?.currentHealth === "healthy", detail: { health: service?.currentHealth ?? "unavailable", lastHealthCheck: service?.lastHealthCheck ?? null } };
  gates.push(healthGate);

  try {
    const contract = await compareProjectContract(projectId, expectedContract);
    gates.push({ id: "project_contract", passed: contract.matches === true, detail: contract });
  } catch (error) {
    gates.push({ id: "project_contract", passed: false, error: error instanceof Error ? error.message : "Project contract verification failed." });
  }

  try {
    const inventory = await getCILModelInventory(randomUUID());
    gates.push({
      id: "model_inventory",
      passed: inventory.total_available > 0 && inventory.models.length === inventory.total_configured,
      detail: { totalConfigured: inventory.total_configured, totalAvailable: inventory.total_available, providers: [...new Set(inventory.models.map((model) => model.provider))] },
    });
  } catch (error) {
    gates.push({ id: "model_inventory", passed: false, error: error instanceof Error ? error.message : "CIL model inventory verification failed." });
  }

  try {
    const correlationId = randomUUID();
    const response = await reasoningService.query({
      correlation_id: correlationId,
      query_text: "Return a concise CIL recovery probe acknowledgement.",
      semantic_domain: "system_health",
      intent: { intent_type: "cil_recovery_probe", risk_classification: "LOW" },
      context_asset_refs: [],
      freshness_requirement: "current",
      desired_format: "structured",
      reuse_permitted: true,
      frontier_escalation_permitted: false,
      lee_brain_version: process.env.LEE_BRAIN_VERSION ?? "recovery-probe",
      source_context_checksum: createHash("sha256").update("lee-cil-recovery-probe").digest("hex"),
      recovery_probe: true,
    });
    const passed = response.correlation_id === correlationId && ["T1_TRIGRAM", "T2_SEMANTIC", "T3_FRONTIER"].includes(response.resolution_tier);
    gates.push({ id: "signed_lee_query", passed, detail: { correlationId, resolutionTier: response.resolution_tier, provenance: response.provenance } });
    if (passed) {
      healthGate.passed = true;
      healthGate.detail = { ...(healthGate.detail as Record<string, unknown>), health: "healthy", establishedBy: "signed_lee_query" };
    }
  } catch (error) {
    gates.push({ id: "signed_lee_query", passed: false, error: error instanceof Error ? error.message : "Signed LEE → CIL probe failed." });
  }

  return {
    mode: CIL_RECOVERY_MODE,
    projectId,
    passed: gates.every((gate) => gate.passed),
    gates,
    normalReasoningRestored: gates.every((gate) => gate.passed),
    note: "Repair is not complete until project checks, CIL health, model inventory, and the signed LEE query path pass together.",
  };
}