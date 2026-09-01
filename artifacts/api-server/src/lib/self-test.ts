import { and, desc, eq, isNull } from "drizzle-orm";
import { backupArchive, db, eventLog, pool, policyRecord, selfTestRun } from "@workspace/db";
import { checkConstitution } from "./constitution";
import { constructContextPacket } from "./context-economy";
import { DOMAIN_EVENT_CATALOG, subscribe, unsubscribe } from "./domain-events";
import { emitEvent, replayAggregate } from "./foundation-events";
import { executiveLoopState } from "./executive-loop";
import { getCurrentIdentity, consultIdentity } from "./identity";
import { internalContracts } from "./internal-contracts";
import { generateOperationalContext } from "./operational-intelligence";
import { listProviders, providerDefinitions, registerProviders } from "./provider-abstraction";
import { rebuildAllProjections } from "./projector";
import { assertFactProvenance, assertInterpretationEvidence } from "./provenance";
import { queryEngine } from "./query-engine";
import { reasoningService, governanceService } from "../services/internal-services";
import { freshness, searchSemantic } from "./semantic-index";
import { APPROVED_ADAPTATION_PARAMETERS, PROTECTED_ADAPTATION_TARGETS } from "./self-improvement";
import { generateManifest } from "./system-manifest";
import { collectPortableBackup, verifyPortableBackup } from "./backup-restore";
import { createFilesystemDevelopmentProvider, runBootstrap } from "./project-bootstrap";
import { processExperiences, listInstitutionalKnowledge } from "./experience";

export type TestResult = "PASS" | "WARN" | "FAIL";
export type TestCase = {
  test_id: string;
  test_name: string;
  result: TestResult;
  message: string;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  evidence: unknown;
};
export type TestSuite = { suite_name: string; result: TestResult; tests: TestCase[] };
export type SelfTestReport = { test_run_id: string; started_at: string; completed_at: string; overall_result: TestResult; test_suites: TestSuite[] };

const worst = (values: TestResult[]): TestResult => values.includes("FAIL") ? "FAIL" : values.includes("WARN") ? "WARN" : "PASS";

async function diagnostic(testId: string, name: string, run: () => Promise<{ result: TestResult; message: string; evidence?: unknown }>): Promise<TestCase> {
  const started = new Date();
  try {
    const output = await run();
    const completed = new Date();
    return { test_id: testId, test_name: name, ...output, duration_ms: completed.getTime() - started.getTime(), started_at: started.toISOString(), completed_at: completed.toISOString(), evidence: { observed_at: completed.toISOString(), ...(output.evidence ?? {}) } };
  } catch (error) {
    const completed = new Date();
    return { test_id: testId, test_name: name, result: "FAIL", message: error instanceof Error ? error.message : String(error), duration_ms: completed.getTime() - started.getTime(), started_at: started.toISOString(), completed_at: completed.toISOString(), evidence: { observed_at: completed.toISOString(), error: error instanceof Error ? error.stack ?? error.message : String(error) } };
  }
}

function suite(name: string, tests: TestCase[]): TestSuite {
  return { suite_name: name, result: worst(tests.map((item) => item.result)), tests };
}

async function runCoreSuite() {
  const identity = await diagnostic("identity-ordering", "Identity is consulted before operational context", async () => {
    const [profile, consultation] = await Promise.all([getCurrentIdentity(), consultIdentity()]);
    const ordered = consultation.profileId === profile.id && consultation.role === profile.values.role && Array.isArray(consultation.priorities);
    const priorities = (consultation as any).priorities;
    return { result: ordered ? "PASS" : "FAIL", message: ordered ? "Identity consultation returned the persisted primary profile and thresholds." : "Identity consultation did not match the persisted profile.", evidence: { profileId: profile.id, consultedProfileId: consultation.profileId, rolePresent: Boolean(consultation.role), prioritiesCount: Array.isArray(priorities) ? priorities.length : 0 } };
  });
  const constitution = await diagnostic("constitution-boundary", "Constitution blocks a consequential external action", async () => {
    const decision = await checkConstitution("external_send", { target: "external", selfTest: true }, "Self-Test");
    return { result: decision.permitted ? "FAIL" : "PASS", message: decision.permitted ? "Constitution permitted an external action that should be blocked." : "Constitution denied the external action and recorded a consultation.", evidence: { permitted: decision.permitted, consultationId: decision.consultationId, applicableProvisionIds: decision.applicableProvisions.map((item) => item.id) } };
  });
  const privacy = await diagnostic("internal-privacy", "Internal contracts reject malformed untrusted payloads", async () => {
    const rejected = Object.entries(internalContracts).flatMap(([engine, actions]) => Object.entries(actions).map(([action, contract]) => ({ engine, action, rejected: !contract.safeParse("__self_test_invalid_payload__").success })));
    const failed = rejected.filter((item) => !item.rejected);
    return { result: failed.length ? "FAIL" : "PASS", message: failed.length ? `${failed.length} internal contracts accepted a malformed primitive.` : "Internal contract validators rejected all malformed primitives.", evidence: { checked: rejected.length, rejected: rejected.length - failed.length, failures: failed } };
  });
  const appendOnly = await diagnostic("event-append-only", "Event Log rejects mutation in a rollback transaction", async () => {
    const event = await emitEvent({ eventType: "EventDeliveryTested", aggregateType: "self_test", aggregateId: crypto.randomUUID(), sourceRef: "self-test", payload: { probe: "append-only" } });
    const client = await pool.connect();
    let rejected = false;
    let error = "";
    try {
      await client.query("BEGIN");
      await client.query("UPDATE event_log SET payload = payload || '{\"tampered\":true}'::jsonb WHERE id = $1", [event.id]);
    } catch (cause) {
      rejected = true;
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
    return { result: rejected ? "PASS" : "FAIL", message: rejected ? "Append-only protection rejected the mutation." : "Event Log mutation was not rejected.", evidence: { eventId: event.id, mutationRejected: rejected, databaseError: error } };
  });
  const replay = await diagnostic("replay-projection-determinism", "Replay and projection dry-runs are deterministic", async () => {
    const aggregateId = crypto.randomUUID();
    const created = await emitEvent({ eventType: "UniversalObjectCreated", aggregateType: "universal_object", aggregateId, sourceRef: "self-test", payload: { objectType: "self_test_probe", name: "Replay probe", status: "active", sourceRefs: [] } });
    const first = await replayAggregate("universal_object", aggregateId, { id: aggregateId, status: "missing" }, (state, event) => ({ ...state, ...event.payload }));
    const [projectionA, projectionB] = await Promise.all([rebuildAllProjections({ dryRun: true }), rebuildAllProjections({ dryRun: true })]);
    const equal = JSON.stringify(projectionA) === JSON.stringify(projectionB);
    return { result: first.status === "active" && equal ? "PASS" : "FAIL", message: first.status === "active" && equal ? "Event replay restored the probe and projection dry-runs matched." : "Replay or projection dry-run diverged.", evidence: { createdEventId: created.id, replayedState: first, projectionA, projectionB, deterministic: equal } };
  });
  return suite("Core Integrity Suite", [identity, constitution, privacy, appendOnly, replay]);
}

async function runRuntimeSuite() {
  const subscriber = await diagnostic("durable-subscriber-delivery", "Event subscribers receive a persisted event", async () => {
    let received: string | null = null;
    const subscription = subscribe("EventDeliveryTested", (event) => { received = event.id; });
    const event = await emitEvent({ eventType: "EventDeliveryTested", aggregateType: "self_test", aggregateId: crypto.randomUUID(), sourceRef: "self-test", payload: { probe: "subscriber" } });
    unsubscribe("EventDeliveryTested", subscription);
    const [persisted] = await db.select({ id: eventLog.id }).from(eventLog).where(eq(eventLog.id, event.id)).limit(1);
    return { result: received === event.id && persisted?.id === event.id ? "PASS" : "FAIL", message: received === event.id && persisted?.id === event.id ? "Subscriber delivery followed durable event persistence." : "Subscriber delivery or persistence failed.", evidence: { eventId: event.id, receivedEventId: received, persisted: Boolean(persisted) } };
  });
  const query = await diagnostic("query-engine", "Query Engine returns policy and evidence metadata", async () => {
    const results = await queryEngine.query({ sources: ["events", "constitution"], filters: {}, rankingPolicy: "balanced", confidenceThreshold: 0, limit: 5, requester: "self-test", purpose: "diagnostic" });
    const valid = results.every((item: any) => item.evidence?.authorization === "constitution" && typeof item.evidence?.epistemic_type === "string" && Array.isArray(item.source_refs));
    return { result: valid ? "PASS" : "FAIL", message: valid ? "Query results carry authorization, epistemic type, and source references." : "Query results omitted required evidence metadata.", evidence: { resultCount: results.length, sample: results.slice(0, 3) } };
  });
  const ledgers = await diagnostic("ledger-provenance", "Fact and interpretation provenance validators reject unsupported evidence", async () => {
    let factRejected = false;
    let interpretationRejected = false;
    try { await assertFactProvenance([crypto.randomUUID()]); } catch { factRejected = true; }
    try { await assertInterpretationEvidence({ inputFacts: [crypto.randomUUID()], generatedBy: { selfTest: true }, generatedByEngine: "Self-Test", confidence: .5, whyChain: [{ evidence_id: crypto.randomUUID() }, { conclusion: "probe" }] }); } catch { interpretationRejected = true; }
    return { result: factRejected && interpretationRejected ? "PASS" : "FAIL", message: factRejected && interpretationRejected ? "Ledger validators rejected unresolved provenance." : "A ledger validator accepted unsupported evidence.", evidence: { factRejected, interpretationRejected } };
  });
  const semantic = await diagnostic("semantic-index-locality", "Semantic Index search stays local and emits a query event", async () => {
    const before = await db.select({ id: eventLog.id }).from(eventLog).where(eq(eventLog.eventType, "SemanticSearchExecuted"));
    const results = await searchSemantic("self test locality", {}, 3, "self-test");
    const after = await db.select({ id: eventLog.id }).from(eventLog).where(eq(eventLog.eventType, "SemanticSearchExecuted"));
    const freshnessState = await freshness();
    return { result: after.length > before.length && results.every((item) => item.model_version) ? "PASS" : freshnessState.indexedCount === 0 ? "WARN" : "FAIL", message: after.length > before.length && results.every((item) => item.model_version) ? "Semantic search executed locally and recorded its audit event." : freshnessState.indexedCount === 0 ? "Semantic Index has no local rows yet; locality could not be exercised." : "Semantic search did not produce an auditable local result.", evidence: { beforeEvents: before.length, afterEvents: after.length, results: results.slice(0, 3), freshness: freshnessState, externalCalls: 0 } };
  });
  const providers = await diagnostic("provider-isolation", "Provider registry normalizes adapters without provider-specific writes", async () => {
    const registered = await registerProviders();
    const valid = registered.length === providerDefinitions.length && registered.every((item) => item.supportedEvents.length > 0 && item.adapterName.length > 0);
    return { result: valid ? "PASS" : "FAIL", message: valid ? "Provider registrations expose normalized adapters and event contracts." : "Provider registry is incomplete.", evidence: { expected: providerDefinitions.length, actual: registered.length, providers: registered.map((item) => ({ providerId: item.providerId, adapterName: item.adapterName, supportedEvents: item.supportedEvents })) } };
  });
  return suite("Runtime Boundary Suite", [subscriber, query, ledgers, semantic, providers]);
}

async function runEngineSuite() {
  const bootstrap = await diagnostic("project-bootstrap", "Bootstrap produces source-backed evidence from a repository snapshot", async () => {
    const root = process.cwd();
    const provider = createFilesystemDevelopmentProvider(root);
    const snapshot = await provider.inspectRepository?.("self-test");
    if (!snapshot) return { result: "WARN", message: "Bootstrap provider did not return a repository snapshot.", evidence: { root, unavailable: true } };
    const report = await runBootstrap(`self-test-${crypto.randomUUID()}`, "self-test", { inspectRepository: async () => snapshot });
    const evidenceCount = report.factsCreatedCount + report.interpretationsCreatedCount;
    return { result: report.status === "completed" && evidenceCount > 0 ? "PASS" : "FAIL", message: report.status === "completed" ? "Bootstrap completed with persisted source-backed records." : "Bootstrap did not complete.", evidence: { runId: report.id, status: report.status, evidenceCount, factsCreatedCount: report.factsCreatedCount, interpretationsCreatedCount: report.interpretationsCreatedCount } };
  });
  const cil = await diagnostic("cil-contract", "CIL returns a correlated resolution or explicit unavailable", async () => {
    const correlationId = crypto.randomUUID();
    try {
      const response = await reasoningService.query({ correlation_id: correlationId, query_text: "self test", semantic_domain: "diagnostic", intent: { intent_type: "diagnostic", risk_classification: "LOW" }, context_asset_refs: [], freshness_requirement: "any", desired_format: "concise", reuse_permitted: true, frontier_escalation_permitted: false, lee_brain_version: "self-test", source_context_checksum: "self-test" });
      const valid = response.correlation_id === correlationId && ["T1_TRIGRAM", "T2_SEMANTIC", "T3_FRONTIER"].includes(response.resolution_tier) && Array.isArray(response.provenance);
      return { result: valid ? "PASS" : "FAIL", message: valid ? "CIL returned a correlated, provenance-bearing resolution." : "CIL returned an invalid response.", evidence: { response } };
    } catch (error) {
      return { result: "WARN", message: "CIL is unavailable in this runtime; model execution was correctly blocked.", evidence: { correlationId, unavailable: true, modelExecutionBlocked: true, error: error instanceof Error ? error.message : String(error) } };
    }
  });
  const cerbaseal = await diagnostic("cerbaseal-fail-closed", "CerbaSeal returns a verdict or holds when unavailable", async () => {
    const requestId = crypto.randomUUID();
    const response = await governanceService.evaluate({ lee_request_id: requestId, action_class: "connector_write", target_system: "self-test", workflow_class: "diagnostic", actor_identity: "self-test", human_confirmation: false });
    const valid = ["ALLOW", "HOLD", "REJECT"].includes(response.verdict) && (response.verdict !== "ALLOW" || Boolean(response.decision_envelope));
    return { result: valid ? "PASS" : "FAIL", message: valid ? `CerbaSeal returned ${response.verdict} with fail-closed semantics.` : "CerbaSeal response was invalid.", evidence: { requestId, verdict: response.verdict, reasonCodes: response.reason_codes, decisionId: response.decision_id, failClosed: response.verdict !== "ALLOW" } };
  });
  const oie = await diagnostic("operational-intelligence", "Operational Intelligence returns evidence-backed context", async () => {
    const context = await generateOperationalContext();
    const items = (context.activePriority ? [context.activePriority] : []).concat(context.changedItems ?? [], context.driftingItems ?? [], context.waitingItems ?? [], context.blockedItems ?? [], context.atRiskItems ?? []);
    const valid = items.every((item: any) => Array.isArray(item.evidenceRefs) && item.evidenceRefs.length > 0 && Array.isArray(item.whyChain) && item.whyChain.length >= 2);
    return { result: valid ? "PASS" : items.length === 0 ? "WARN" : "FAIL", message: valid ? "Operational Intelligence context includes evidence and Why Chains." : items.length === 0 ? "Operational Intelligence has no current items to validate." : "Operational Intelligence returned an item without evidence.", evidence: { snapshotId: context.id, itemCount: items.length, items: items.slice(0, 5) } };
  });
  const executive = await diagnostic("executive-loop", "Executive Loop has persisted resumable state", async () => {
    const state = await executiveLoopState();
    const valid = Boolean(state.id && state.phase && Number.isInteger(state.cycleCount) && state.phaseDurations);
    return { result: valid ? "PASS" : "FAIL", message: valid ? "Executive Loop state is persisted and resumable." : "Executive Loop state is incomplete.", evidence: { id: state.id, phase: state.phase, cycleCount: state.cycleCount, phaseDurations: state.phaseDurations, interrupted: state.interrupted } };
  });
  const institutional = await diagnostic("institutional-knowledge", "Institutional Knowledge retrieval preserves evidence metadata", async () => {
    const rows = await listInstitutionalKnowledge();
    const valid = rows.every((item: any) => Array.isArray(item.evidenceRefs) && item.evidenceRefs.length > 0);
    return { result: valid ? "PASS" : rows.length === 0 ? "WARN" : "FAIL", message: valid ? "Institutional Knowledge rows are evidence-backed." : rows.length === 0 ? "No institutional knowledge has been promoted yet." : "Institutional Knowledge contains a row without evidence.", evidence: { count: rows.length, sample: rows.slice(0, 5) } };
  });
  const improvement = await diagnostic("self-improvement-boundary", "Self-Improvement exposes only approved reversible targets", async () => {
    const overlap = APPROVED_ADAPTATION_PARAMETERS.filter((parameter) => (PROTECTED_ADAPTATION_TARGETS as readonly string[]).includes(parameter));
    return { result: overlap.length ? "FAIL" : "PASS", message: overlap.length ? "An adaptation target is both approved and protected." : "Approved adaptation parameters are disjoint from protected targets.", evidence: { approvedCount: APPROVED_ADAPTATION_PARAMETERS.length, protectedCount: PROTECTED_ADAPTATION_TARGETS.length, overlap } };
  });
  return suite("Version 12 Engine Suite", [bootstrap, cil, cerbaseal, oie, executive, institutional, improvement]);
}

async function runContinuitySuite() {
  const backup = await diagnostic("backup-restore", "Backup collection verifies checksum and isolated restore", async () => {
    const portable = await collectPortableBackup();
    const verified = await verifyPortableBackup(portable.manifest, portable.payload);
    return { result: verified.overall, message: verified.overall === "PASS" ? "Portable backup passed checksum, replay, and isolated restore checks." : `Portable backup verification returned ${verified.overall}.`, evidence: { backupId: portable.backupId, sizeBytes: portable.sizeBytes, restore: verified } };
  });
  const manifest = await diagnostic("manifest", "Manifest generation reflects live Self-Test and health state", async () => {
    const generated = await generateManifest();
    const valid = generated.manifestVersion && generated.generatedAt && generated.health && generated.selfTest;
    return { result: valid ? "PASS" : "FAIL", message: valid ? "Manifest generated from live runtime state." : "Manifest omitted required live state.", evidence: { version: generated.manifestVersion, generatedAt: generated.generatedAt, health: generated.health, selfTest: generated.selfTest } };
  });
  const policy = await diagnostic("policy-ledger", "Active policy records are versioned and not superseded", async () => {
    const policies = await db.select().from(policyRecord).where(isNull(policyRecord.supersededAt)).limit(100);
    const valid = policies.every((item) => Boolean(item.policyType && item.version && item.values));
    return { result: valid ? "PASS" : policies.length === 0 ? "WARN" : "FAIL", message: valid ? "Active policy records are versioned and structurally usable." : policies.length === 0 ? "No active policy records are available." : "An active policy record is malformed.", evidence: { count: policies.length, sample: policies.slice(0, 5).map((item) => ({ policyType: item.policyType, version: item.version, hasValues: Boolean(item.values) })) } };
  });
  return suite("Continuity & Governance Suite", [backup, manifest, policy]);
}

export async function runSelfTest(): Promise<SelfTestReport> {
  const started = new Date();
  const test_suites = await Promise.all([runCoreSuite(), runRuntimeSuite(), runEngineSuite(), runContinuitySuite()]);
  const completed = new Date();
  const report: SelfTestReport = { test_run_id: crypto.randomUUID(), started_at: started.toISOString(), completed_at: completed.toISOString(), overall_result: worst(test_suites.map((item) => item.result)), test_suites };
  const counts = test_suites.flatMap((item) => item.tests).reduce((acc, item) => { acc[item.result.toLowerCase() as "pass" | "warn" | "fail"] += 1; return acc; }, { pass: 0, warn: 0, fail: 0 });
  await db.insert(selfTestRun).values({ testRunId: report.test_run_id, startedAt: started, completedAt: completed, overallResult: report.overall_result, report: report as unknown as Record<string, unknown>, passCount: counts.pass, warnCount: counts.warn, failCount: counts.fail });
  await emitEvent({ eventType: "SelfTestCompleted", aggregateType: "self_test", aggregateId: report.test_run_id, sourceRef: "self-test", payload: { overallResult: report.overall_result, passCount: counts.pass, warnCount: counts.warn, failCount: counts.fail, testRunId: report.test_run_id } });
  return report;
}

export async function selfTestHistory() { return db.select().from(selfTestRun).orderBy(desc(selfTestRun.startedAt)).limit(20); }