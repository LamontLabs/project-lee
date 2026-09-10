import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { desc, eq } from "drizzle-orm";
import { bootstrapRun, db, executionReadiness, internalCapabilityService } from "@workspace/db";
import { generateManifest } from "./system-manifest";
import { getLatestDesktopSetup } from "./desktop-setup";
import { configuredProjects, listProjects, localProjectInspect, projectFor, inspectProject } from "./mcp-project-bridge";
import { getDeliveryEvidence } from "./delivery-evidence";
import { getLatestK6AuthorityRehearsal } from "./k6-authority-rehearsal";
import { getOllamaStatus } from "./local-cognition";
import { getOfflineAwareness } from "./offline-awareness";
import { BOOTSTRAP_OBJECTIVE_METRICS, BOOTSTRAP_OBJECTIVE_PURPOSE, BOOTSTRAP_OBJECTIVE_SOURCE, BOOTSTRAP_OBJECTIVE_TITLE, getBootstrapObjective } from "./executive-objectives";

export const BOOTSTRAP_AWARENESS_VERSION = "2.0.0";
export const BOOTSTRAP_OBJECTIVE = {
  id: "k6-desktop-operational-readiness",
  title: BOOTSTRAP_OBJECTIVE_TITLE,
  statement: BOOTSTRAP_OBJECTIVE_PURPOSE,
  status: "active",
  authority: "owner",
} as const;

export type AwarenessStatus = "healthy" | "partial" | "degraded" | "blocked" | "stale" | "deferred" | "unverified";
export type AwarenessFreshness = "current" | "stale" | "unverified";
type Evidence = { source: string; observedAt: string | null; detail: string; refs?: string[] };
export type AwarenessItem = {
  id: string;
  label: string;
  status: AwarenessStatus;
  detail: string;
  evidence: Evidence[];
  freshness: AwarenessFreshness;
  ownerActionRequired?: boolean;
};

const now = () => new Date().toISOString();
const iso = (value: unknown) => value ? new Date(value as Date | string).toISOString() : null;
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const listLength = (value: unknown) => Array.isArray(value) ? value.length : 0;

function statusFor(value: unknown): AwarenessStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (["healthy", "connected", "complete", "available", "operational", "nominal", "verified", "pass", "passed"].includes(normalized)) return "healthy";
  if (["degraded", "recovering"].includes(normalized)) return "degraded";
  if (["partial", "warn", "warning", "needs_owner"].includes(normalized)) return "partial";
  if (["blocked", "failed", "critical", "offline", "unavailable", "rejected"].includes(normalized)) return "blocked";
  if (normalized === "stale") return "stale";
  return "unverified";
}

function evidence(source: string, detail: string, observedAt: unknown = now(), refs?: string[]): Evidence {
  return { source, detail, observedAt: iso(observedAt), ...(refs?.length ? { refs } : {}) };
}

function freshnessFor(evidenceItems: Evidence[], thresholdMs = 24 * 60 * 60 * 1000): AwarenessFreshness {
  const observed = evidenceItems.map((item) => item.observedAt ? new Date(item.observedAt).getTime() : 0).filter((value) => value > 0);
  if (!observed.length) return "unverified";
  return Date.now() - Math.max(...observed) > thresholdMs ? "stale" : "current";
}

function finalizeItem(item: Omit<AwarenessItem, "freshness">, thresholdMs?: number): AwarenessItem {
  const freshness = freshnessFor(item.evidence, thresholdMs);
  const status = freshness === "stale" && ["healthy", "partial"].includes(item.status) ? "stale" : item.status;
  return { ...item, status, freshness };
}

function answer(id: string, question: string, answerText: string, status: AwarenessStatus, sourceItems: AwarenessItem[], generatedAt: string) {
  const relevant = sourceItems.filter((item) => item.status !== "healthy" || item.freshness !== "current");
  const answerEvidence = relevant.flatMap((item) => item.evidence).slice(0, 6);
  return {
    id,
    question,
    answer: answerText,
    status,
    freshness: answerEvidence.length ? freshnessFor(answerEvidence) : "current" as AwarenessFreshness,
    evidence: answerEvidence.length ? answerEvidence : [evidence("bootstrap-awareness", "Derived from the current self-model projection.", generatedAt)],
  };
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
    return [finalizeItem({ id: "replit-task-registry", label: "Active Replit tasks", status: "unverified", detail: "The workspace task registry is not available to this runtime.", evidence: [evidence("workspace:.local/tasks", "Task registry unavailable.", null)] })];
  }
  try {
    const names = (await readdir(taskRoot)).filter((name) => name.endsWith(".md")).sort();
    const tasks = await Promise.all(names.slice(0, 100).map(async (name) => {
      const content = await readFile(join(taskRoot, name), "utf8").catch(() => "");
      const title = content.match(/^#\s+(.+)$/m)?.[1] ?? name.replace(/\.md$/, "").replaceAll("-", " ");
      return finalizeItem({ id: name, label: title, status: "unverified" as const, detail: "A durable task specification exists in the workspace. Live project-task assignment is not exposed to the runtime.", evidence: [evidence(`workspace:${join(".local", "tasks", name)}`, "Task specification present.", null, [`.local/tasks/${name}`])] });
    }));
    return tasks;
  } catch {
    return [finalizeItem({ id: "replit-task-registry", label: "Active Replit tasks", status: "unverified", detail: "The workspace task registry is not available to this runtime.", evidence: [evidence("workspace:.local/tasks", "Task registry unavailable.", null)] })];
  }
}

async function projectBridgeState() {
  const projects = await listProjects();
  const configuredSelfProject = configuredProjects().find((project) => /project[\s_-]*lee|lee/i.test(`${project.id} ${project.name}`));
  const selfProjectId = process.env.LEE_SELF_PROJECT_ID ?? configuredSelfProject?.id ?? projects.find((project) => /project[\s_-]*lee|lee/i.test(`${project.id} ${project.name}`))?.id;
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
    status: inspection.status === "healthy" ? "healthy" : projects.length ? "partial" : "unverified",
    registeredProjects: projects.map((project) => ({ ...project, allowedOperations: project.allowedOperations.filter((operation) => ["inspect", "search", "read", "dependencies", "logs", "contract", "deployment"].includes(operation)) })),
    selfInspection: inspection,
    localProject: { ...local, readOnlyOperations: ["inspect", "search", "read", "dependencies", "logs", "contract", "deployment"], mutationOperationsExcluded: ["preview", "apply", "restart", "check"] },
    authority: "OBSERVE",
  };
}

function workState(manifest: any, runs: any[], readiness: any[], k6Ready: boolean): Record<string, unknown> {
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
    deferred: k6Ready
      ? ["Any real authority transfer remains owner-controlled; the completed rehearsal did not change production authority."]
      : ["Verified K6 handoff and canonical Brain authority transfer remain deferred until the rehearsal passes all required proofs."],
    evidence: [evidence("bootstrap_run", latestRun ? `Latest run ${latestRun.id} is ${latestRun.status}.` : "No bootstrap run is recorded.", iso(latestRun?.completedAt ?? latestRun?.startedAt), latestRun ? [latestRun.id] : undefined), evidence("execution_readiness", `${readiness.length} readiness snapshot(s) are available.`)],
    projectCount: listLength(manifest.knowledge?.projects),
  };
}

export async function getBootstrapAwareness() {
  const generatedAt = now();
  const [manifest, desktop, services, runs, readiness, taskItems, bridge, k6Rehearsal, persistedObjective, ollamaStatus, offline] = await Promise.all([
    generateManifest({ emitEvent: false }),
    getLatestDesktopSetup(),
    db.select().from(internalCapabilityService),
    db.select().from(bootstrapRun).orderBy(desc(bootstrapRun.startedAt)).limit(20),
    db.select().from(executionReadiness).orderBy(desc(executionReadiness.computedAt)).limit(20),
    workspaceTasks(),
    projectBridgeState(),
    getLatestK6AuthorityRehearsal(),
    getBootstrapObjective(),
    getOllamaStatus(),
    getOfflineAwareness(),
  ]);
  const delivery = await getDeliveryEvidence();
  const latestReadiness = readiness[0];
  const previousReadiness = readiness[1];
  const readinessDelta = latestReadiness && previousReadiness ? Number((latestReadiness.overallScore - previousReadiness.overallScore).toFixed(1)) : null;
  const setupStatus = desktop?.status ?? "unverified";
  const deliveryItems = {
    build: finalizeItem({ ...delivery.build }, 24 * 60 * 60 * 1000),
    tests: finalizeItem({ ...delivery.tests }, 24 * 60 * 60 * 1000),
    deployment: finalizeItem({ ...delivery.deployment }, 24 * 60 * 60 * 1000),
    packaging: finalizeItem({ ...delivery.packaging }, 30 * 24 * 60 * 60 * 1000),
  };
  const packaging = deliveryItems.packaging;
  const objectiveEvidence = persistedObjective?.evidence?.map((item: any) => evidence(`executive-objective:${persistedObjective.id}`, item.summary, item.createdAt, item.eventId ? [item.eventId] : undefined)) ?? [];
  const objective = {
    ...BOOTSTRAP_OBJECTIVE,
    persisted: Boolean(persistedObjective),
    recordId: persistedObjective?.id ?? null,
    title: persistedObjective?.title ?? BOOTSTRAP_OBJECTIVE.title,
    statement: persistedObjective?.purpose ?? BOOTSTRAP_OBJECTIVE.statement,
    status: persistedObjective?.status ?? "unverified",
    healthStatus: persistedObjective?.healthStatus ?? "UNVERIFIED",
    progressNarrative: persistedObjective?.progressNarrative ?? "The durable readiness objective has not been initialized by the service runtime.",
    currentBlockers: persistedObjective?.currentBlockers ?? [],
    successMetrics: persistedObjective?.successMetrics ?? [...BOOTSTRAP_OBJECTIVE_METRICS],
    relatedProjects: persistedObjective?.relatedProjects ?? ["Project LEE", "K6"],
    currentOwner: persistedObjective?.currentOwner ?? "Founder",
    evidence: objectiveEvidence.length ? objectiveEvidence : [evidence(BOOTSTRAP_OBJECTIVE_SOURCE, persistedObjective ? "Persisted objective has no evidence rows." : "Objective persistence is not verified in this runtime.", persistedObjective ? generatedAt : null)],
    freshness: objectiveEvidence.length ? freshnessFor(objectiveEvidence) : "unverified" as AwarenessFreshness,
  };
  const canonicalBrain: AwarenessItem = finalizeItem({
    id: "canonical-brain",
    label: "Canonical Brain",
    status: manifest.brainState.status === "verified" ? "healthy" : statusFor(manifest.brainState.status),
    detail: manifest.brainState.status === "verified" ? "One verified Brain version is authoritative for this runtime." : "Brain authority is not currently verified.",
    evidence: [evidence("system_manifest.brainState", `Version ${manifest.brainState.version ?? "unknown"} · checksum ${manifest.brainState.checksum ?? "unavailable"}.`, manifest.brainState.verifiedAt, manifest.brainState.version ? [String(manifest.brainState.version)] : undefined)],
  }, 30 * 24 * 60 * 60 * 1000);
  const eventLog: AwarenessItem = finalizeItem({
    id: "event-log",
    label: "Append-only Event Log",
    status: manifest.eventLog.appendOnly === true ? "healthy" : "blocked",
    detail: manifest.eventLog.appendOnly === true ? `${manifest.eventLog.recordCount ?? 0} event(s) are visible through the canonical log projection.` : "Append-only continuity is not verified.",
    evidence: [evidence("system_manifest.eventLog", "Event history is projected from the canonical Event Log.", manifest.eventLog.latestEventAt, ["event_log"])],
  });
  const serviceItem = (id: string, label: string, detail: string): AwarenessItem => {
    const service = services.find((row) => row.serviceId === id);
    return finalizeItem({ id, label, status: statusFor(service?.currentHealth), detail: service ? `${detail} Current health: ${service.currentHealth}.` : `${detail} The service is not registered.`, evidence: [evidence(`internal_capability_service:${id}`, service ? `Last health check ${iso(service.lastHealthCheck) ?? "not recorded"}.` : "No service registration.", iso(service?.lastHealthCheck))] }, 15 * 60 * 1000);
  };
  const desktopItem: AwarenessItem = finalizeItem({
    id: "desktop-runtime",
    label: "K6 desktop runtime",
    status: setupStatus === "complete" ? "partial" : statusFor(setupStatus),
    detail: desktop ? `Latest setup run is ${setupStatus}; ${packaging.detail}` : `No desktop setup run is recorded. ${packaging.detail}`,
    evidence: [evidence("desktop_setup_run", desktop ? `Setup run ${desktop.id} is ${setupStatus}.` : "No setup record.", iso(desktop?.updatedAt ?? desktop?.completedAt), desktop ? [desktop.id] : undefined), ...packaging.evidence],
    ownerActionRequired: setupStatus === "needs_owner",
  }, 24 * 60 * 60 * 1000);
  const k6Evidence = asRecord(k6Rehearsal?.evidence);
  const k6Ready = k6Rehearsal?.status === "passed" && k6Evidence.readinessEligible === true;
  const k6Matrix = Array.isArray(k6Evidence.readinessMatrix) ? k6Evidence.readinessMatrix as Array<Record<string, any>> : [];
  const k6MatrixFailures = k6Matrix.filter((item) => item.status !== "verified").map((item) => item.key);
  const k6RehearsalItem: AwarenessItem = finalizeItem({
    id: "k6-authority-rehearsal",
    label: "K6 authority transfer rehearsal",
    status: k6Ready ? "healthy" : k6Rehearsal?.status === "failed" ? "blocked" : k6Rehearsal ? "partial" : "unverified",
    detail: k6Ready
      ? "The owner-approved, simulation-only transfer rehearsal passed every cross-system readiness domain, including backup, continuity, governance, interruption, recovery, reversal, packaged runtime, and identity/personality continuity."
      : k6Rehearsal
        ? `The latest simulation-only rehearsal is ${k6Rehearsal.status}; K6 transfer readiness remains blocked until every required proof passes.${k6MatrixFailures.length ? ` Unverified domains: ${k6MatrixFailures.join(", ")}.` : ""}`
        : "No owner-approved K6 authority transfer rehearsal has been recorded.",
    evidence: [
      evidence(
        "k6_authority_rehearsal",
        k6Rehearsal ? `Rehearsal ${k6Rehearsal.id} is ${k6Rehearsal.status}.` : "No K6 authority rehearsal is recorded.",
        iso(k6Rehearsal?.updatedAt),
        k6Rehearsal ? [k6Rehearsal.id] : undefined,
      ),
      ...k6Matrix.flatMap((item) => item.evidence ? [evidence(String(item.evidence.source ?? `k6:${item.key}`), String(item.detail ?? "K6 readiness evidence."), item.evidence.observedAt, Array.isArray(item.evidence.refs) ? item.evidence.refs.map(String) : undefined)] : []),
    ],
    ownerActionRequired: !k6Ready,
  });
  const connections: AwarenessItem = finalizeItem({
    id: "connections",
    label: "Connection health",
    status: manifest.connectors.some((item: any) => ["unavailable", "failed", "error"].includes(String(item.status).toLowerCase())) || manifest.providers.some((item: any) => ["unavailable", "failed", "error"].includes(String(item.status).toLowerCase())) ? "blocked" : manifest.connectors.length || manifest.providers.length ? "partial" : "unverified",
    detail: `${manifest.connectors.length} connector(s) and ${manifest.providers.length} provider registration(s) are visible; connectivity, freshness, and authority remain separate.`,
    evidence: [evidence("system_manifest.connectors", "Provider-neutral connector projection.", generatedAt), evidence("system_manifest.providers", "Provider registration projection.", generatedAt)],
  });
  const postgresql: AwarenessItem = finalizeItem({
    id: "postgresql",
    label: "PostgreSQL",
    status: "healthy",
    detail: "The live API successfully read PostgreSQL-backed Brain, Event Log, service, and readiness ledgers.",
    evidence: [evidence("postgresql", "Database-backed awareness projection completed.", generatedAt)],
  });
  const localCognition: AwarenessItem = finalizeItem({
    id: "ollama-local-cognition",
    label: "Local K6 cognition (Ollama)",
    status: !ollamaStatus.enabled ? "deferred" : statusFor(ollamaStatus.health),
    detail: !ollamaStatus.enabled
      ? "Local cognition is explicitly disabled; no local model execution is permitted."
      : ollamaStatus.configured
        ? `Ollama is the only registered local execution destination. CIL must select the route, and only approved background workloads may use it. Current health: ${ollamaStatus.health}.`
        : "The governed Ollama destination is not configured; local execution will fail closed until the runtime is available.",
    evidence: [evidence("internal_capability_service:ollama", ollamaStatus.configured ? `Health ${ollamaStatus.health}; last check ${iso(ollamaStatus.lastHealthCheck) ?? "not recorded"}.` : "Ollama service registration or endpoint is unavailable.", ollamaStatus.lastHealthCheck, ["ollama", "cil-route-authority"])],
    ownerActionRequired: ollamaStatus.health !== "healthy" && ollamaStatus.enabled,
  }, 15 * 60 * 1000);
  const externalReality: AwarenessItem = finalizeItem({
    id: "external-reality",
    label: "External provider reality",
    status: offline.state === "offline" ? "blocked" : offline.state === "degraded" ? "degraded" : offline.state === "current" ? "healthy" : "unverified",
    detail: offline.summary,
    evidence: offline.providers.filter((item) => item.state !== "unverified").slice(0, 8).map((item) => evidence(`provider-freshness:${item.provider}`, `${item.provider} evidence is ${item.freshnessLabel}; last successful refresh ${item.lastSuccessfulRefreshAt ?? "not recorded"}.`, item.lastSuccessfulRefreshAt, [item.provider])),
    ownerActionRequired: offline.state !== "current" && offline.state !== "unverified",
  }, 24 * 60 * 60 * 1000);
  const { build, tests, deployment } = deliveryItems;
  const work = workState(manifest, runs, readiness, k6Ready);
  const targetArchitecture = [
    { id: "canonical-brain", label: "Canonical Brain authority", status: canonicalBrain.status, detail: "K6 must receive an explicit, verified, backed-up, auditable, reversible authority transfer.", evidence: canonicalBrain.evidence, freshness: canonicalBrain.freshness },
    { id: "event-log", label: "Event Log continuity", status: eventLog.status, detail: "Migration testing must preserve append-only history and sequence continuity.", evidence: eventLog.evidence, freshness: eventLog.freshness },
    { id: "governance", label: "Governance boundary", status: manifest.governance.failClosed === true ? "healthy" : "blocked", detail: "CerbaSeal ALLOW and owner confirmation remain required for consequential actions.", evidence: [evidence("system_manifest.governance", `Fail-closed=${String(manifest.governance.failClosed)}.`, generatedAt)], freshness: "current" as AwarenessFreshness },
    { id: "packaged-runtime", label: "Packaged runtime", status: packaging.status, detail: "Signed installer, native PostgreSQL/API startup, migration, restart, and cleanup evidence must be retained.", evidence: packaging.evidence, freshness: packaging.freshness },
    { id: "reversible-migration", label: "Reversible migration test", status: k6RehearsalItem.status, detail: k6Ready ? "The simulation reversed without competing canonical history." : "No complete proof is exposed that a tested transfer can be reversed without competing history.", evidence: k6RehearsalItem.evidence, freshness: k6RehearsalItem.freshness },
    { id: "k6-transfer-rehearsal", label: "K6 transfer rehearsal", status: k6RehearsalItem.status, detail: k6RehearsalItem.detail, evidence: k6RehearsalItem.evidence, freshness: k6RehearsalItem.freshness },
  ];
  const blockers: AwarenessItem[] = [
    ...(canonicalBrain.status !== "healthy" ? [canonicalBrain] : []),
    ...(eventLog.status !== "healthy" ? [eventLog] : []),
    ...(packaging.status !== "healthy" ? [packaging] : []),
    ...(deployment.status !== "healthy" ? [deployment] : []),
    ...(k6RehearsalItem.status !== "healthy" ? [k6RehearsalItem] : []),
    ...(bridge.status !== "healthy" ? [finalizeItem({ id: "project-bridge", label: "Project bridge", status: bridge.status as AwarenessStatus, detail: "The registered Project LEE repository is not fully verified through the read-only bridge.", evidence: [evidence("mcp-project-bridge", "Self-repository bridge evidence is incomplete.", null)] })] : []),
    ...((latestReadiness?.dimensions ?? []).filter((dimension: any) => Number(dimension.score) < 70).map((dimension: any) => finalizeItem({ id: `readiness-${dimension.key}`, label: `Readiness: ${dimension.key}`, status: "partial" as const, detail: dimension.explanation, evidence: [evidence("execution_readiness", `Score ${dimension.score}/100.`, iso(latestReadiness.computedAt), dimension.sourceRefs)] }))),
  ].slice(0, 12);
  const systemItems: AwarenessItem[] = [
    postgresql,
    canonicalBrain,
    eventLog,
    serviceItem("cil", "CIL", "CIL remains the mandatory reasoning and model-routing authority."),
    serviceItem("cerbaseal", "CerbaSeal", "CerbaSeal remains the fail-closed governance authority."),
    localCognition,
    externalReality,
    connections,
    desktopItem,
    k6RehearsalItem,
  ];
  const brokenSystems = systemItems.filter((item) => ["blocked", "degraded", "stale"].includes(item.status));
  const readinessStatus: AwarenessStatus = blockers.some((item) => item.status === "blocked") ? "blocked" : blockers.some((item) => ["partial", "degraded", "stale"].includes(item.status)) ? "partial" : k6Ready ? "healthy" : "unverified";
  const bootstrapQuestions = [
    answer("blockers", "What blocks verified K6 desktop operational readiness?", blockers.length ? blockers.slice(0, 5).map((item) => item.detail).join(" ") : "No blocker was derived from the current evidence, but readiness is not complete without the required K6 proof.", readinessStatus, blockers, generatedAt),
    answer("broken-systems", "What is broken, degraded, or stale right now?", brokenSystems.length ? brokenSystems.map((item) => `${item.label}: ${item.detail}`).join(" ") : "No broken, degraded, or stale subsystem was observed in this read.", brokenSystems.length ? "partial" : "healthy", brokenSystems, generatedAt),
    {
      id: "next-work",
      question: "What should happen next?",
      answer: blockers.length ? blockers.slice(0, 5).map((item) => item.label).join("; ") : "Continue collecting authoritative K6 delivery and transfer evidence before declaring completion.",
      status: blockers.length ? readinessStatus : "unverified",
      freshness: freshnessFor(blockers.flatMap((item) => item.evidence)),
      evidence: blockers.flatMap((item) => item.evidence).slice(0, 6),
    },
    {
      id: "replit-changes",
      question: "What did Replit change?",
      answer: "The runtime can see durable workspace task specifications and authoritative delivery signals, but live Replit assignment/change history is not connected; no change is claimed without that evidence.",
      status: "unverified",
      freshness: freshnessFor(taskItems.flatMap((item) => item.evidence)),
      evidence: [...taskItems.flatMap((item) => item.evidence), ...deliveryItems.build.evidence, ...deliveryItems.tests.evidence].slice(0, 6),
    },
    {
      id: "readiness-improvement",
      question: "How has readiness improved?",
      answer: readinessDelta === null ? "No comparable readiness snapshot is available." : readinessDelta > 0 ? `The latest readiness snapshot improved by ${readinessDelta} points.` : readinessDelta < 0 ? `The latest readiness snapshot declined by ${Math.abs(readinessDelta)} points.` : "The latest comparable readiness snapshot did not move.",
      status: readinessDelta === null ? "unverified" : readinessDelta > 0 ? "healthy" : readinessDelta < 0 ? "partial" : "unverified",
      freshness: latestReadiness ? freshnessFor([evidence("execution_readiness", "Comparable readiness snapshot.", iso(latestReadiness.computedAt), [latestReadiness.id])]) : "unverified",
      evidence: [evidence("execution_readiness", latestReadiness ? `Latest score ${latestReadiness.overallScore}/100; delta ${readinessDelta ?? "unavailable"}.` : "No readiness snapshot is recorded.", iso(latestReadiness?.computedAt), latestReadiness ? [latestReadiness.id] : undefined)],
    },
    answer("subsystem-health", "What is the health of each major subsystem?", systemItems.map((item) => `${item.label}: ${item.status}.`).join(" "), brokenSystems.length ? "partial" : systemItems.some((item) => item.status === "unverified") ? "unverified" : "healthy", systemItems, generatedAt),
  ];
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
      status: process.env.LEE_VERSION || process.env.GITHUB_SHA ? "healthy" : "unverified",
      freshness: process.env.GITHUB_SHA ? "current" : "unverified",
      evidence: [evidence("system_manifest.identity", "Identity is projected from the live system manifest.", generatedAt)],
    },
    objective,
    work,
    activeReplitTasks: { status: taskItems.some((item) => item.status === "healthy") ? "partial" : "unverified", items: taskItems, detail: "Workspace task specifications are visible; assignment and live agent ownership require an explicit Replit task bridge.", evidence: [evidence("workspace:.local/tasks", `${taskItems.length} durable task specification(s) inspected.`, generatedAt)] },
    delivery: { ...deliveryItems, evidence: [deliveryItems.build, deliveryItems.tests, deliveryItems.deployment, deliveryItems.packaging].flatMap((item) => item.evidence) },
    readiness: {
      goal: "K6 desktop operational readiness",
      status: readinessStatus,
      score: latestReadiness?.overallScore ?? null,
      highestGap: latestReadiness?.highestGap ?? null,
      latestChangeMovement: readinessDelta === null ? { status: "unverified", detail: "A comparable readiness snapshot is not available." } : { status: readinessDelta > 0 ? "healthy" : readinessDelta < 0 ? "partial" : "unverified", delta: readinessDelta, detail: readinessDelta > 0 ? "The latest recorded readiness snapshot moved upward." : readinessDelta < 0 ? "The latest recorded readiness snapshot moved downward." : "The latest recorded readiness snapshot did not move." },
      blockers,
      evidence: [evidence("execution_readiness", latestReadiness ? `Latest launch readiness is ${latestReadiness.overallScore}/100.` : "No readiness score is recorded.", iso(latestReadiness?.computedAt), latestReadiness ? [latestReadiness.id] : undefined)],
      k6AuthorityRehearsal: k6Rehearsal,
      readinessMatrix: k6Matrix,
    },
    systems: {
      status: brokenSystems.some((item) => item.status === "blocked") ? "blocked" : brokenSystems.length ? "partial" : systemItems.some((item) => item.status === "unverified") ? "unverified" : "healthy",
      items: systemItems,
      targetK6Architecture: targetArchitecture,
      evidence: [evidence("system_manifest", "Existing manifest, service registry, setup, and readiness projections were composed without creating a parallel engine.", generatedAt)],
    },
    externalReality: offline,
    bootstrapQuestions,
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
      "Build, test, deployment, and packaged release evidence remain unverified unless their authoritative producer reports a fresh signal.",
      ...(k6Ready ? [] : ["K6 authority transfer and reversal have not passed as a single auditable migration rehearsal."]),
      ...(work.blocked as string[]),
    ].slice(0, 20),
    technicalDebtEvidence: [
      evidence("workspace:.local/tasks", "Live Replit task assignment is not exposed to the API runtime.", null),
      ...[deliveryItems.build, deliveryItems.tests, deliveryItems.deployment, deliveryItems.packaging].filter((item) => item.status !== "healthy").flatMap((item) => item.evidence),
      ...k6RehearsalItem.evidence,
    ],
    next: blockers.slice(0, 5).map((item) => ({ action: item.label, reason: item.detail, status: item.status, evidence: item.evidence })),
    inspectionBoundary: {
      inspectedSources: ["System Manifest", "Execution Readiness", "Desktop Setup", "Internal Service Registry", "Project Bootstrap", "MCP Project Bridge", "workspace task specifications"],
      readOnly: true,
      canonicalBrainPreserved: true,
      duplicateHistoryCreated: false,
    },
  };
}