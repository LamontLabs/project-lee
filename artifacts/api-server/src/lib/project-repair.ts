import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  auditLog,
  db,
  eventLog,
  governanceRequest,
} from "@workspace/db";
import {
  projectRepairAttempt,
  projectRepairEvidence,
  projectRepairRun,
  projectRepairStep,
  projectRepairVerification,
} from "@workspace/db/schema";
import {
  applyProjectChanges,
  compareProjectContract,
  inspectProject,
  inspectProjectDependencies,
  inspectProjectDeployment,
  inspectProjectLogs,
  previewProjectChanges,
  readProjectFile,
  restartProject,
  runProjectCheck,
  searchProject,
  projectFor,
  type Change,
  type ProjectOperation,
} from "./mcp-project-bridge";
import { currentProjectMomentum } from "./project-momentum";
import { registerAction } from "./governance-engine";

export const REPAIR_RUN_STATUSES = ["OBSERVED", "EVIDENCE_READY", "AWAITING_APPROVAL", "APPROVED", "RUNNING", "VERIFYING", "RETRY_WAIT", "SUCCEEDED", "BLOCKED", "FAILED"] as const;
export type RepairRunStatus = typeof REPAIR_RUN_STATUSES[number];
export const REPAIR_STEP_STATUSES = ["PENDING", "RUNNING", "RETRY_WAIT", "SUCCEEDED", "FAILED", "BLOCKED"] as const;
export type RepairStepStatus = typeof REPAIR_STEP_STATUSES[number];

export type RepairPlanStepInput = {
  id?: string;
  operation: ProjectOperation;
  input?: Record<string, unknown>;
  dependsOn?: string[];
  maxAttempts?: number;
};

type RepairRunRequest = {
  reason: string;
  requestedBy?: string;
  steps: RepairPlanStepInput[];
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

async function audit(action: string, runId: string, outcome: string, metadata: Record<string, unknown> = {}) {
  await db.insert(auditLog).values({ action, actor: "project-repair", targetType: "project_repair_run", targetId: runId, outcome, metadata }).catch(() => undefined);
}

async function event(eventType: string, runId: string, payload: Record<string, unknown>) {
  await db.insert(eventLog).values({ eventType, aggregateType: "project_repair_run", aggregateId: runId, sourceRef: "project-repair", occurredAt: new Date(), payload }).catch(() => undefined);
}

function normalizePlan(steps: RepairPlanStepInput[]) {
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 50) throw new Error("A repair plan must contain between 1 and 50 steps.");
  return steps.map((step, index) => {
    if (!step || !["inspect", "search", "read", "dependencies", "logs", "contract", "deployment", "check", "preview", "restart", "apply"].includes(step.operation)) throw new Error(`Unsupported repair operation at step ${index + 1}.`);
    return {
      id: String(step.id ?? `step-${index + 1}`).slice(0, 96),
      operation: step.operation,
      input: step.input && typeof step.input === "object" ? step.input : {},
      dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn.map(String).slice(0, 20) : [],
      maxAttempts: Math.max(1, Math.min(5, Number(step.maxAttempts) || 3)),
    };
  });
}

export async function createRepairRun(projectId: string, request: RepairRunRequest) {
  if (!projectFor(projectId)) throw new Error(`Unknown project: ${projectId}`);
  const plan = normalizePlan(request.steps);
  const planHash = hash(plan);
  const [run] = await db.insert(projectRepairRun).values({
    projectId,
    requestedBy: request.requestedBy ?? "owner",
    request: { reason: request.reason, requestedBy: request.requestedBy ?? "owner" },
    plan,
    planHash,
    diagnosis: { state: "observation_pending" },
  }).returning();
  if (!run) throw new Error("Repair run could not be created.");
  for (const [ordinal, step] of plan.entries()) {
    await db.insert(projectRepairStep).values({
      runId: run.id,
      ordinal,
      stepKey: step.id,
      operation: step.operation,
      input: step.input,
      dependsOn: step.dependsOn,
      maxAttempts: step.maxAttempts,
      idempotencyKey: hash({ runId: run.id, ordinal, operation: step.operation, input: step.input }),
    });
  }
  await event("RepairRunCreated", run.id, { projectId, planHash, stepCount: plan.length });
  await audit("project_repair_created", run.id, "success", { projectId, planHash, stepCount: plan.length });
  return getRepairRun(run.id);
}

export async function getRepairRun(runId: string) {
  const [run] = await db.select().from(projectRepairRun).where(eq(projectRepairRun.id, runId)).limit(1);
  if (!run) return null;
  const [steps, evidence, attempts, verifications] = await Promise.all([
    db.select().from(projectRepairStep).where(eq(projectRepairStep.runId, runId)).orderBy(asc(projectRepairStep.ordinal)),
    db.select().from(projectRepairEvidence).where(eq(projectRepairEvidence.runId, runId)).orderBy(desc(projectRepairEvidence.capturedAt)),
    db.select().from(projectRepairAttempt).where(eq(projectRepairAttempt.runId, runId)).orderBy(desc(projectRepairAttempt.startedAt)),
    db.select().from(projectRepairVerification).where(eq(projectRepairVerification.runId, runId)).orderBy(desc(projectRepairVerification.verifiedAt)),
  ]);
  return { ...run, steps, evidence, attempts, verifications };
}

export async function listRepairRuns(projectId?: string) {
  const rows = projectId
    ? await db.select().from(projectRepairRun).where(eq(projectRepairRun.projectId, projectId)).orderBy(desc(projectRepairRun.updatedAt)).limit(100)
    : await db.select().from(projectRepairRun).orderBy(desc(projectRepairRun.updatedAt)).limit(100);
  return Promise.all(rows.map((row) => getRepairRun(row.id)));
}

export async function collectRepairEvidence(runId: string) {
  const run = await getRepairRun(runId);
  if (!run) throw new Error("Repair run not found.");
  let inspection: Record<string, unknown>;
  try {
    inspection = await inspectProject(run.projectId) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project inspection failed.";
    await db.update(projectRepairRun).set({ status: "BLOCKED", diagnosis: { state: "observation_failed", error: message }, updatedAt: new Date() }).where(eq(projectRepairRun.id, runId));
    await audit("project_repair_evidence", runId, "failed", { error: message });
    throw new Error(message);
  }
  const momentum = /^[0-9a-f-]{36}$/i.test(run.projectId) ? await currentProjectMomentum(run.projectId).catch(() => []) : [];
  const content = { inspection, momentum, capturedAt: new Date().toISOString() };
  const contentHash = hash(content);
  const [evidence] = await db.insert(projectRepairEvidence).values({ runId, kind: "project_observation", sourceRef: `project:${run.projectId}`, content, contentHash }).returning();
  const evidenceBundleHash = hash({ planHash: run.planHash, evidence: [contentHash] });
  await db.update(projectRepairRun).set({
    status: "EVIDENCE_READY",
    diagnosis: { state: "observed", project: inspection, momentum, supportedBy: evidence?.id ?? null },
    evidenceBundleHash,
    updatedAt: new Date(),
  }).where(eq(projectRepairRun.id, runId));
  await event("RepairEvidenceCaptured", runId, { evidenceId: evidence?.id, evidenceBundleHash, momentumAvailable: momentum.length > 0 });
  await audit("project_repair_evidence", runId, "success", { evidenceBundleHash, evidenceId: evidence?.id });
  return getRepairRun(runId);
}

export async function requestRepairApproval(runId: string) {
  const run = await getRepairRun(runId);
  if (!run) throw new Error("Repair run not found.");
  if (run.status !== "EVIDENCE_READY" || !run.evidenceBundleHash) throw new Error("Fresh evidence is required before requesting repair approval.");
  const evidenceRefs = run.evidence.map((item) => item.id);
  const governance = await registerAction({
    actionType: "project_apply",
    payload: { projectId: run.projectId, repairRunId: run.id, planHash: run.planHash, evidenceBundleHash: run.evidenceBundleHash },
    reason: String((run.request as any).reason ?? "Owner-requested project repair."),
    evidenceRefs,
    affectedObject: `project:${run.projectId}`,
    actor: run.requestedBy,
  });
  await db.update(projectRepairRun).set({ status: "AWAITING_APPROVAL", governanceRequestId: governance.record.id, updatedAt: new Date() }).where(eq(projectRepairRun.id, runId));
  await event("RepairApprovalRequested", runId, { governanceRequestId: governance.record.id, planHash: run.planHash, evidenceBundleHash: run.evidenceBundleHash });
  await audit("project_repair_approval_requested", runId, "success", { governanceRequestId: governance.record.id });
  return getRepairRun(runId);
}

export async function approveRepair(runId: string, ownerConfirmed: boolean) {
  if (!ownerConfirmed) throw new Error("Explicit owner confirmation is required.");
  const run = await getRepairRun(runId);
  if (!run || !run.governanceRequestId) throw new Error("Repair approval has not been requested.");
  if (run.status !== "AWAITING_APPROVAL") throw new Error("Repair run is not awaiting approval.");
  const [governance] = await db.select().from(governanceRequest).where(eq(governanceRequest.id, run.governanceRequestId)).limit(1);
  if (!governance || governance.status !== "ALLOW") throw new Error("CerbaSeal ALLOW is required before a repair can run.");
  const payload = governance.requestPayload as Record<string, unknown>;
  if (payload.planHash !== run.planHash || payload.evidenceBundleHash !== run.evidenceBundleHash) throw new Error("The governance approval does not match the current repair plan and evidence.");
  await db.update(projectRepairRun).set({ status: "APPROVED", ownerConfirmed: true, updatedAt: new Date() }).where(eq(projectRepairRun.id, runId));
  await event("RepairApproved", runId, { governanceRequestId: run.governanceRequestId });
  await audit("project_repair_approved", runId, "success", { governanceRequestId: run.governanceRequestId });
  return getRepairRun(runId);
}

function retryable(error: unknown) {
  const status = Number((error as any)?.status ?? 0);
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500 || /timeout|temporar|network|unavailable/i.test(error instanceof Error ? error.message : "");
}

async function executeOperation(projectId: string, step: typeof projectRepairStep.$inferSelect, run: typeof projectRepairRun.$inferSelect, evidenceRefs: string[]) {
  const input = step.input ?? {};
  switch (step.operation) {
    case "inspect": return inspectProject(projectId);
    case "search": return searchProject(projectId, String(input.query ?? ""));
    case "read": return readProjectFile(projectId, String(input.path ?? ""));
    case "dependencies": return inspectProjectDependencies(projectId);
    case "logs": return inspectProjectLogs(projectId, Number(input.limit ?? 100));
    case "contract": return compareProjectContract(projectId, (input.expected ?? {}) as Record<string, unknown>);
    case "deployment": return inspectProjectDeployment(projectId);
    case "check": return runProjectCheck(projectId, String(input.command ?? "pnpm run typecheck"));
    case "preview": return previewProjectChanges(projectId, (input.changes ?? []) as Change[]);
    case "restart": return restartProject(projectId);
    case "apply": return applyProjectChanges(projectId, (input.changes ?? []) as Change[], String(input.confirmationToken ?? ""), {
      ownerConfirmed: run.ownerConfirmed,
      humanConfirmed: run.ownerConfirmed,
      evidenceRefs,
      reason: String((run.request as any).reason ?? "Owner-approved project repair."),
    });
  }
}

export async function executeRepairStep(runId: string, stepId: string) {
  const run = await getRepairRun(runId);
  if (!run) throw new Error("Repair run not found.");
  if (!["APPROVED", "RUNNING", "RETRY_WAIT"].includes(run.status)) throw new Error("Repair run is not approved to execute.");
  const step = run.steps.find((item) => item.id === stepId);
  if (!step) throw new Error("Repair step not found.");
  const unmet = step.dependsOn.some((dependency) => !run.steps.some((item) => (item.id === dependency || item.stepKey === dependency || String(item.ordinal) === dependency) && item.status === "SUCCEEDED"));
  if (unmet) throw new Error("Repair step dependencies have not succeeded.");
  if (step.operation === "apply") {
    if (!run.steps.some((item) => item.operation === "preview" && item.status === "SUCCEEDED")) throw new Error("A successful change preview is required before application.");
    if (!run.steps.some((item) => item.operation === "check" && item.status === "SUCCEEDED")) throw new Error("A successful safe check is required before application.");
  }
  if (step.status === "SUCCEEDED") return run;
  const attemptNo = step.attemptCount + 1;
  const startedAt = new Date();
  await db.update(projectRepairStep).set({ status: "RUNNING", attemptCount: attemptNo, startedAt, updatedAt: startedAt }).where(eq(projectRepairStep.id, step.id));
  await db.update(projectRepairRun).set({ status: "RUNNING", updatedAt: startedAt }).where(eq(projectRepairRun.id, runId));
  const [attempt] = await db.insert(projectRepairAttempt).values({ runId, stepId: step.id, attemptNo, status: "RUNNING", idempotencyKey: step.idempotencyKey, inputHash: hash(step.input), startedAt }).returning();
  try {
    const output = await executeOperation(run.projectId, step, run, run.evidence.map((item) => item.id));
    const outputRecord = output && typeof output === "object" ? output as Record<string, unknown> : { value: output };
    const completedAt = new Date();
    await db.update(projectRepairStep).set({ status: "SUCCEEDED", output: outputRecord, completedAt, updatedAt: completedAt }).where(eq(projectRepairStep.id, step.id));
    if (attempt) await db.update(projectRepairAttempt).set({ status: "SUCCEEDED", outputHash: hash(outputRecord), completedAt }).where(eq(projectRepairAttempt.id, attempt.id));
    await event("RepairStepCompleted", runId, { stepId, attemptNo, operation: step.operation });
    await audit("project_repair_step", runId, "success", { stepId, attemptNo, operation: step.operation });
    return getRepairRun(runId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair step failed.";
    const canRetry = retryable(error) && attemptNo < step.maxAttempts;
    const completedAt = new Date();
    if (attempt) await db.update(projectRepairAttempt).set({ status: canRetry ? "RETRY_WAIT" : "FAILED", errorClass: error instanceof Error ? error.name : "Error", errorMessage: message, retryable: canRetry, completedAt }).where(eq(projectRepairAttempt.id, attempt.id));
    await db.update(projectRepairStep).set({ status: canRetry ? "RETRY_WAIT" : "FAILED", lastError: message, retryAt: canRetry ? new Date(Date.now() + attemptNo * 30_000) : null, updatedAt: completedAt }).where(eq(projectRepairStep.id, step.id));
    await db.update(projectRepairRun).set({ status: canRetry ? "RETRY_WAIT" : "BLOCKED", updatedAt: completedAt }).where(eq(projectRepairRun.id, runId));
    await event(canRetry ? "RepairRetryScheduled" : "RepairStepFailed", runId, { stepId, attemptNo, message, retryable: canRetry });
    await audit("project_repair_step", runId, canRetry ? "retry_scheduled" : "failed", { stepId, attemptNo, message });
    throw new Error(message);
  }
}

export async function verifyRepairRun(runId: string) {
  const run = await getRepairRun(runId);
  if (!run) throw new Error("Repair run not found.");
  await db.update(projectRepairRun).set({ status: "VERIFYING", updatedAt: new Date() }).where(eq(projectRepairRun.id, runId));
  const allStepsPassed = run.steps.length > 0 && run.steps.every((step) => step.status === "SUCCEEDED");
  let observed: Record<string, unknown> = { allStepsPassed, stepCount: run.steps.length };
  let result: "PASS" | "FAIL" = allStepsPassed ? "PASS" : "FAIL";
  if (allStepsPassed) {
    try { observed = { ...observed, project: await inspectProject(run.projectId) as Record<string, unknown> }; }
    catch (error) { result = "FAIL"; observed = { ...observed, error: error instanceof Error ? error.message : "Final project inspection failed." }; }
  }
  const outputHash = hash(observed);
  await db.insert(projectRepairVerification).values({ runId, verifier: "project-repair-final-inspection", expected: { allStepsPassed: true }, observed, result, evidenceRefs: run.evidence.map((item) => item.id), outputHash, attemptNo: Math.max(...run.steps.map((step) => step.attemptCount), 0) });
  const nextStatus = result === "PASS" ? "SUCCEEDED" : "BLOCKED";
  await db.update(projectRepairRun).set({ status: nextStatus, completedAt: result === "PASS" ? new Date() : null, updatedAt: new Date() }).where(eq(projectRepairRun.id, runId));
  await event(result === "PASS" ? "RepairRunSucceeded" : "RepairVerificationFailed", runId, { result, outputHash });
  await audit("project_repair_verification", runId, result === "PASS" ? "success" : "failed", { result, outputHash });
  return getRepairRun(runId);
}

export async function resumeRepairRuns() {
  const running = await db.select().from(projectRepairRun).where(inArray(projectRepairRun.status, ["RUNNING", "RETRY_WAIT"]));
  const recovered = [];
  for (const run of running) {
    const steps = await db.select().from(projectRepairStep).where(and(eq(projectRepairStep.runId, run.id), eq(projectRepairStep.status, "RUNNING")));
    for (const step of steps) {
      if (step.startedAt && Date.now() - step.startedAt.getTime() > 10 * 60_000) {
        await db.update(projectRepairStep).set({ status: "RETRY_WAIT", retryAt: new Date(), lastError: "Recovered after an interrupted worker lease.", updatedAt: new Date() }).where(eq(projectRepairStep.id, step.id));
        await db.update(projectRepairRun).set({ status: "RETRY_WAIT", updatedAt: new Date() }).where(eq(projectRepairRun.id, run.id));
      }
    }
    recovered.push(run.id);
  }
  return recovered;
}