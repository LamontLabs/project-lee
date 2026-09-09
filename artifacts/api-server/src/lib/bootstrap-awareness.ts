import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { desc, eq } from "drizzle-orm";
import { bootstrapRun, db, executionReadiness, internalCapabilityService } from "@workspace/db";
import { generateManifest } from "./system-manifest";
import { getLatestDesktopSetup } from "./desktop-setup";
import { allowedProjectOperations, configuredProjects, listProjects, localProjectInspect, projectFor, inspectProject } from "./mcp-project-bridge";

export const BOOTSTRAP_AWARENESS_VERSION = "1.0.0";
export const BOOTSTRAP_OBJECTIVE = {
  id: "k6-desktop-operational-readiness",
  title: "Reach verified Project LEE desktop operational readiness on the K6",
  statement: "Reach verified Project LEE desktop operational readiness on the K6 while preserving the canonical Brain, Event Log, governance boundaries, and all existing working functionality.",
  status: "active",
  authority: "owner",
} as const;

type AwarenessStatus = "healthy" | "partial" | "blocked" | "deferred" | "unverified";
type Evidence = { source: string; observedAt: string | null; detail: string; refs?: string[] };
export type AwarenessItem = {
  id: string;
  label: string;
  status: AwarenessStatus;
  detail: string;
  evidence: Evidence[];
  ownerActionRequired?: boolean;
};

const now = () => new Date().toISOString();
const iso = (value: unknown) => value ? new Date(value as Date | string).toISOString() : null;
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const listLength = (value: unknown) => Array.isArray(value) ? value.length : 0;

function statusFor(value: unknown): AwarenessStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (["healthy", "connected", "complete", "available", "operational", "nominal", "verified", "pass", "passed"].includes(normalized)) return "healthy";
  if (["degraded", "partial", "warn", "warning", "needs_owner", "recovering"].includes(normalized)) return "partial";
  if (["blocked", "failed", "critical", "offline", "unavailable", "rejected"].includes(normalized)) return "blocked";
  return "unverified";
}

function evidence(source: string, detail: string, observedAt: unknown = now(), refs?: string[]): Evidence {
  return { source, detail, observedAt: iso(observedAt), ...(refs?.length ? { refs } : {}) };
}

function envSignal(name: string, label: string): AwarenessItem {
  const value = process.env[name];
  return value
    ? { id: name.toLowerCase(), label, status: statusFor(value), detail: `Reported by ${name}.`, evidence: [evidence(`environment:${name}`, value)] }
    : { id: name.toLowerCase(), label, status: "unverified", detail: `No ${name} signal is configured for this runtime.`, evidence: [evidence(`environment:${name}`, "No signal configured.", null)] };
}

async function workspaceTasks(): Promise<AwarenessItem[]> {
  const roots = [
    process.env.LEE_PROJECT_ROOT,
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
  ].filter((root): root is string => Boolean(root));
  let taskRoot: string | null = null;
  for (const root of roots) {
    const candidate = join(root, ".local", "tasks");
    try {
      await readdir(candidate);
      taskRoot = candidate;
      break;
    } catch {
      // The API may run from an artifact directory rather than the workspace root.
    }
  }
  if (!taskRoot) {
    return [{ id: "replit-task-registry", label: "Active Replit tasks", status: "unverified", detail: "The workspace task registry is not available to this runtime.", evidence: [evidence("workspace:.local/tasks", "Task registry unavailable.", null)] }];
  }
  try {
    const names = (await readdir(taskRoot)).filter((name) => name.endsWith(".md")).sort();
    const tasks = await Promise.all(names.slice(0, 100).map(async (name) => {
      const content = await readFile(join(taskRoot, name), "utf8").catch(() => "");
      const title = content.match(/^#\s+(.+)$/m)?.[1] ?? name.replace(/\.md$/, "").replaceAll("-", " ");
      return { id: name, label: title, status: "unverified" as const, detail: "A durable task specification exists in the workspace. Live project-task assignment is not exposed to the runtime.", evidence: [evidence(`workspace:${join(".local", "tasks", name)}`, "Task specification present.", null, [`.local/tasks/${name}`])] };
    }));
    return tasks;
  } catch {
    return [{ id: "replit-task-registry", label: "Active Replit tasks", status: "unverified", detail: "The workspace task registry is not available to this runtime.", evidence: [evidence("workspace:.local/tasks", "Task registry unavailable.", null)] }];
  }
}

async function projectBridgeState() {
  const projects = await listProjects();
  const selfProjectId = process.env.LEE_SELF_PROJECT_ID ?? projects.find((project) => /project[\s_-]*lee|lee/i.test(`${project.id} ${project.name}`))?.id;
  const selfProject = selfProjectId ? projectFor(selfProjectId) : undefined;
  let inspection: Record<string, unknown> = {
    status: "unverified",
    detail: selfProject ? "A self project is registered but has not been inspected in this awareness read." : "No LEE_SELF_PROJECT_ID is configured; registered project metadata is visible, but self-repository inspection is not claimed.",
    evidence: [evidence("mcp-project-bridge", "Read-only bridge metadata is available; self-repository identity is not verified.", null)],
  };
  if (selfProject) {
    try {
      const result = await inspectProject(selfProject.id);
      inspection = { status: "healthy", detail: "The registered Project LEE repository answered the read-only inspect operation.", evidence: [evidence(`mcp-project:${selfProject.id}`, "Inspect operation succeeded.")], result };
    } catch (error) {
      inspection = { status: "partial", detail: error instanceof Error ? error.message : "Self-repository inspection failed.", evidence: [evidence(`mcp-project:${selfProject.id}`, "Inspect operation did not complete.", null)] };
    }
  }
  const local = await localProjectInspect();
  return {
    status: projects.length ? "partial" : "unverified",
    registeredProjects: projects.map((project) => ({ ...project, allowedOperations: project.allowedOperations.filter((operation) => ["inspect", "search", "read", "dependencies", "logs", "contract", "deployment"].includes(operation)) })),
    selfInspection: inspection,
    localProject: { ...local, readOnlyOperations: ["inspect", "search", "read", "dependencies", "logs", "contract", "deployment"], mutationOperationsExcluded: ["preview", "apply", "restart", "check"] },
    authority: "OBSERVE",
  };
}

function workState(manifest: any, runs: any[], readiness: any[]): Record<string, unknown> {
  const latestRun = runs[0];
  const report = asRecord(latestRun?.report);
  const issues = Array.isArray(report.issues) ? report.issues.map(String) : [];
  const questions = Array.isArray(report.questions) ? report.questions.map(String) : [];
  const gaps = readiness.flatMap((item) => (item.dimensions ?? []).filter((dimension: any) => Number(dimension.score) < 70).map((dimension: any) => `${dimension.key}: ${dimension.explanation}`));
  const blocked = [...issues, ...gaps].slice(0, 20);
  return {
    completed: latestRun?.status === "completed" ? [`Repository bootstrap completed for ${latestRun.repositoryId}.`] : [],
    partial: [...(latestRun ? [`Bootstrap evidence includes ${latestRun.factsCreatedCount} fact(s), ${latestRun.interpretationsCreatedCount} interpretation(s), and ${latestRun.issuesFlagged} flagged issue(s).`] : []), ...questions.slice(0, 10)],
    blocked,
    deferred: ["Verified K6 handoff and canonical Brain authority transfer remain deferred until migration testing is explicitly authorized."],
    evidence: [evidence("bootstrap_run", latestRun ? `Latest run ${latestRun.id} is ${latestRun.status}.` : "No bootstrap run is recorded.", iso(latestRun?.completedAt ?? latestRun?.startedAt), latestRun ? [latestRun.id] : undefined), evidence("execution_readiness", `${readiness.length} readiness snapshot(s) are available.`)],
    projectCount: listLength(manifest.knowledge?.projects),
  };
}

export async function getBootstrapAwareness() {
  const generatedAt = now();
  const [manifest, desktop, services, runs, readiness, taskItems, bridge] = await Promise.all([
    generateManifest({ emitEvent: false }),
    getLatestDesktopSetup(),
    db.select().from(internalCapabilityService),
    db.select().from(bootstrapRun).orderBy(desc(bootstrapRun.startedAt)).limit(20),
    db.select().from(executionReadiness).orderBy(desc(executionReadiness.computedAt)).limit(20),
    workspaceTasks(),
    projectBridgeState(),
  ]);
  const latestReadiness = readiness[0];
  const previousReadiness = readiness[1];
  const readinessDelta = latestReadiness && previousReadiness ? Number((latestReadiness.overallScore - previousReadiness.overallScore).toFixed(1)) : null;
  const setupStatus = desktop?.status ?? "unverified";
  const canonicalBrain: AwarenessItem = {
    id: "canonical-brain",
    label: "Canonical Brain",
    status: manifest.brainState.status === "verified" ? "healthy" : statusFor(manifest.brainState.status),
    detail: manifest.brainState.status === "verified" ? "One verified Brain version is authoritative for this runtime." : "Brain authority is not currently verified.",
    evidence: [evidence("system_manifest.brainState", `Version ${manifest.brainState.version ?? "unknown"} · checksum ${manifest.brainState.checksum ?? "unavailable"}.`, manifest.brainState.verifiedAt, manifest.brainState.version ? [String(manifest.brainState.version)] : undefined)],
  };
  const eventLog: AwarenessItem = {
    id: "event-log",
    label: "Append-only Event Log",
    status: manifest.eventLog.appendOnly === true ? "healthy" : "blocked",
    detail: manifest.eventLog.appendOnly === true ? `${manifest.eventLog.recordCount ?? 0} event(s) are visible through the canonical log projection.` : "Append-only continuity is not verified.",
    evidence: [evidence("system_manifest.eventLog", "Event history is projected from the canonical Event Log.", manifest.eventLog.latestEventAt, ["event_log"])],
  };
  const serviceItem = (id: string, label: string, detail: string): AwarenessItem => {
    const service = services.find((row) => row.serviceId === id);
    return { id, label, status: statusFor(service?.currentHealth), detail: service ? `${detail} Current health: ${service.currentHealth}.` : `${detail} The service is not registered.`, evidence: [evidence(`internal_capability_service:${id}`, service ? `Last health check ${iso(service.lastHealthCheck) ?? "not recorded"}.` : "No service registration.", iso(service?.lastHealthCheck))] };
  };
  const desktopItem: AwarenessItem = {
    id: "desktop-runtime",
    label: "K6 desktop runtime",
    status: setupStatus === "complete" ? "partial" : statusFor(setupStatus),
    detail: desktop ? `Latest setup run is ${setupStatus}; packaged release evidence is ${process.env.LEE_DESKTOP_RELEASE_STATUS ? "reported" : "not connected to this runtime"}.` : "No desktop setup run is recorded.",
    evidence: [evidence("desktop_setup_run", desktop ? `Setup run ${desktop.id} is ${setupStatus}.` : "No setup record.", iso(desktop?.updatedAt ?? desktop?.completedAt), desktop ? [desktop.id] : undefined), evidence("desktop-release", process.env.LEE_DESKTOP_RELEASE_STATUS ?? "No packaged release signal.", process.env.LEE_DESKTOP_RELEASE_STATUS ? generatedAt : null)],
    ownerActionRequired: setupStatus === "needs_owner",
  };
  const connections: AwarenessItem = {
    id: "connections",
    label: "Connection health",
    status: manifest.connectors.length || manifest.providers.length ? "partial" : "unverified",
    detail: `${manifest.connectors.length} connector(s) and ${manifest.providers.length} provider registration(s) are visible; connectivity and authority remain separate.`,
    evidence: [evidence("system_manifest.connectors", "Provider-neutral connector projection.", generatedAt), evidence("system_manifest.providers", "Provider registration projection.", generatedAt)],
  };
  const postgresql: AwarenessItem = {
    id: "postgresql",
    label: "PostgreSQL",
    status: "healthy",
    detail: "The live API successfully read PostgreSQL-backed Brain, Event Log, service, and readiness ledgers.",
    evidence: [evidence("postgresql", "Database-backed awareness projection completed.", generatedAt)],
  };
  const packaging = envSignal("LEE_DESKTOP_RELEASE_STATUS", "Desktop packaging");
  const build = envSignal("LEE_BUILD_STATUS", "Build status");
  const tests = envSignal("LEE_TEST_STATUS", "Test status");
  const deployment = envSignal("LEE_DEPLOYMENT_STATUS", "Deployment status");
  const work = workState(manifest, runs, readiness);
  const targetArchitecture = [
    { id: "canonical-brain", label: "Canonical Brain authority", status: canonicalBrain.status, detail: "K6 must receive an explicit, verified, backed-up, auditable, reversible authority transfer." },
    { id: "event-log", label: "Event Log continuity", status: eventLog.status, detail: "Migration testing must preserve append-only history and sequence continuity." },
    { id: "governance", label: "Governance boundary", status: manifest.governance.failClosed === true ? "healthy" : "blocked", detail: "CerbaSeal ALLOW and owner confirmation remain required for consequential actions." },
    { id: "packaged-runtime", label: "Packaged runtime", status: packaging.status, detail: "Signed installer, native PostgreSQL/API startup, migration, restart, and cleanup evidence must be retained." },
    { id: "reversible-migration", label: "Reversible migration test", status: "unverified", detail: "No live proof is exposed that a tested transfer can be reversed without competing history." },
  ];
  const blockers: AwarenessItem[] = [
    ...(canonicalBrain.status !== "healthy" ? [canonicalBrain] : []),
    ...(eventLog.status !== "healthy" ? [eventLog] : []),
    ...(packaging.status !== "healthy" ? [packaging] : []),
    ...(deployment.status !== "healthy" ? [deployment] : []),
    ...(bridge.status !== "healthy" ? [{ id: "project-bridge", label: "Project bridge", status: bridge.status as AwarenessStatus, detail: "The registered Project LEE repository is not fully verified through the read-only bridge.", evidence: [evidence("mcp-project-bridge", "Self-repository bridge evidence is incomplete.", null)] }] : []),
    ...((latestReadiness?.dimensions ?? []).filter((dimension: any) => Number(dimension.score) < 70).map((dimension: any) => ({ id: `readiness-${dimension.key}`, label: `Readiness: ${dimension.key}`, status: "partial" as const, detail: dimension.explanation, evidence: [evidence("execution_readiness", `Score ${dimension.score}/100.`, iso(latestReadiness.computedAt), dimension.sourceRefs)] }))),
  ].slice(0, 12);
  return {
    awarenessVersion: BOOTSTRAP_AWARENESS_VERSION,
    generatedAt,
    mode: "bootstrap_awareness",
    identity: {
      name: "Project LEE",
      currentVersion: process.env.LEE_VERSION ?? manifest.identity.leeVersion ?? null,
      build: process.env.GITHUB_SHA ?? process.env.REPLIT_DEPLOYMENT_ID ?? null,
      environment: process.env.NODE_ENV ?? "unknown",
      authority: "canonical Brain + Event Log",
      evidence: [evidence("system_manifest.identity", "Identity is projected from the live system manifest.", generatedAt)],
    },
    objective: { ...BOOTSTRAP_OBJECTIVE, evidence: [evidence("bootstrap-awareness", "Owner-defined bootstrap objective.", generatedAt)] },
    work,
    activeReplitTasks: { status: taskItems.some((item) => item.status === "healthy") ? "partial" : "unverified", items: taskItems, detail: "Workspace task specifications are visible; assignment and live agent ownership require an explicit Replit task bridge.", evidence: [evidence("workspace:.local/tasks", `${taskItems.length} durable task specification(s) inspected.`, generatedAt)] },
    delivery: { build, tests, deployment, packaging, evidence: [build, tests, deployment, packaging].flatMap((item) => item.evidence) },
    readiness: {
      goal: "K6 desktop operational readiness",
      status: blockers.length ? "partial" : "unverified",
      score: latestReadiness?.overallScore ?? null,
      highestGap: latestReadiness?.highestGap ?? null,
      latestChangeMovement: readinessDelta === null ? { status: "unverified", detail: "A comparable readiness snapshot is not available." } : { status: readinessDelta > 0 ? "healthy" : readinessDelta < 0 ? "partial" : "unverified", delta: readinessDelta, detail: readinessDelta > 0 ? "The latest recorded readiness snapshot moved upward." : readinessDelta < 0 ? "The latest recorded readiness snapshot moved downward." : "The latest recorded readiness snapshot did not move." },
      blockers,
      evidence: [evidence("execution_readiness", latestReadiness ? `Latest launch readiness is ${latestReadiness.overallScore}/100.` : "No readiness score is recorded.", iso(latestReadiness?.computedAt), latestReadiness ? [latestReadiness.id] : undefined)],
    },
    systems: {
      status: blockers.length ? "partial" : "healthy",
      items: [postgresql, canonicalBrain, eventLog, serviceItem("cil", "CIL", "CIL remains the mandatory reasoning and model-routing authority."), serviceItem("cerbaseal", "CerbaSeal", "CerbaSeal remains the fail-closed governance authority."), connections, desktopItem],
      targetK6Architecture: targetArchitecture,
      evidence: [evidence("system_manifest", "Existing manifest, service registry, setup, and readiness projections were composed without creating a parallel engine.", generatedAt)],
    },
    projectBridge: bridge,
    permissions: {
      current: manifest.permissions,
      bootstrapAwareness: ["read_system_state", "inspect_registered_project_repo", "read_files_manifests_logs_build_and_packaging_evidence"],
      explicitlyDenied: ["self_modify", "escalate_permissions", "deploy", "change_governance", "change_cil_boundary", "change_cerbaseal_boundary", "security_change", "brain_migration", "destructive_action"],
      governance: manifest.governance,
      evidence: [evidence("system_contract.permissions", "Read-only awareness does not grant modification authority.", generatedAt)],
    },
    technicalDebt: [
      "Live Replit task assignment is not yet exposed to the runtime self-model.",
      "Build, test, deployment, and packaged release evidence are unverified unless the owning pipeline reports signals.",
      "K6 authority transfer and reversal have not been exercised as a single auditable migration test.",
      ...(work.blocked as string[]),
    ].slice(0, 20),
    next: blockers.slice(0, 5).map((item) => ({ action: item.label, reason: item.detail, status: item.status, evidence: item.evidence })),
    inspectionBoundary: {
      inspectedSources: ["System Manifest", "Execution Readiness", "Desktop Setup", "Internal Service Registry", "Project Bootstrap", "MCP Project Bridge", "workspace task specifications"],
      readOnly: true,
      canonicalBrainPreserved: true,
      duplicateHistoryCreated: false,
    },
  };
}