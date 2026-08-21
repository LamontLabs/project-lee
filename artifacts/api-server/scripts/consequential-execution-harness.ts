import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, governanceRule } from "@workspace/db";
import { executeProviderWrite } from "../src/lib/provider-abstraction";

type Mode = "ALLOW" | "HOLD" | "REJECT" | "MALFORMED" | "EXPIRED" | "CONFIRMATION" | "AUTH_FAILURE" | "GATE_RESULT" | "REPLAY";
let mode: Mode = "ALLOW";
let calls = 0;
const runId = randomUUID();

const server = http.createServer(async (_request, response) => {
  calls += 1;
  response.setHeader("content-type", "application/json");
  if (mode === "AUTH_FAILURE") {
    response.statusCode = 401;
    return response.end(JSON.stringify({ error: "unauthorized" }));
  }
  const expiry = mode === "EXPIRED" ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 60_000).toISOString();
  if (mode === "MALFORMED") return response.end(JSON.stringify({ verdict: "ALLOW" }));
  if (mode === "GATE_RESULT") return response.end(JSON.stringify({
    decisionEnvelope: {
      envelopeId: `env-${runId}-${calls}`,
      requestId: "test-request",
      workflowClass: "your_workflow_class",
      finalState: "ALLOW",
      permittedActionClass: "escalate",
      humanApprovalRequired: false,
      humanApprovalPresent: true,
      proposalSourceKind: "deterministic_rule",
      immutable: true,
      evidenceBundleId: `evidence-${runId}-${calls}`,
      trace: { checkedInvariants: ["stub"], reasonCodes: ["DECISION_ALLOWED"], evaluatedAt: new Date().toISOString() },
      issuedAt: new Date().toISOString(),
    },
    releaseAuthorization: {
      releaseAuthorizationId: `release-${runId}-${calls}`,
      requestId: "test-request",
      envelopeId: `env-${runId}-${calls}`,
      actionClass: "escalate",
      releasedAt: new Date().toISOString(),
    },
    blockedActionRecord: null,
  }));
  return response.end(JSON.stringify({
    verdict: mode === "CONFIRMATION" || mode === "REPLAY" ? "ALLOW" : mode,
    reason_codes: [`STUB_${mode}`],
    checked_invariants: ["stub"],
     decision_id: mode === "REPLAY" ? `decision-replayed-${runId}` : `decision-${runId}-${calls}`,
    decision_envelope: `envelope-${runId}`,
    evidence_bundle_ref: "evidence",
    audit_entry_ref: "audit",
    policy_version: "test",
    timestamp: new Date().toISOString(),
    replay_checksum: `checksum-${runId}-${calls}`,
    authorization_expiry: expiry,
    human_confirmation_required: mode === "CONFIRMATION",
  }));
});

async function main() {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const previousBaseUrl = process.env.CERBASEAL_BASE_URL;
  const previousEvaluateEndpoint = process.env.CERBASEAL_EVALUATE_ENDPOINT;
  process.env.CERBASEAL_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.CERBASEAL_EVALUATE_ENDPOINT = `http://127.0.0.1:${port}/evaluate`;
  const [rule] = await db.insert(governanceRule).values({
    ruleType: "always_allow",
    actionPattern: "connector_write",
    reason: "execution boundary harness",
    createdBy: "test",
  }).returning();

  async function attempt(options: Partial<Parameters<typeof executeProviderWrite>[0]> = {}) {
    let writes = 0;
    const result = await executeProviderWrite({
      provider: "github",
      payload: { repository: "test/repo", operation: "write" },
      reason: "test consequential provider write",
      evidenceRefs: ["test:evidence"],
      ownerConfirmed: true,
      humanConfirmed: true,
      write: () => { writes += 1; return { ok: true }; },
      ...options,
    });
    return { result, writes };
  }

  test("valid unexpired ALLOW is the only path that reaches the provider writer", { concurrency: false }, async () => {
  mode = "ALLOW";
  const { result, writes } = await attempt();
  assert.equal(result.executed, true);
  assert.equal(writes, 1);
  });

  test("CerbaSeal-Core GateResult is normalized without weakening the execution gate", { concurrency: false }, async () => {
    mode = "GATE_RESULT";
    const { result, writes } = await attempt();
    assert.equal(result.executed, true);
    assert.equal(writes, 1);
  });

  test("missing owner or human confirmation blocks without contacting CerbaSeal", { concurrency: false }, async () => {
  const before = calls;
  const { result, writes } = await attempt({ ownerConfirmed: false });
  assert.equal(result.executed, false);
  assert.equal(result.reason, "HUMAN_CONFIRMATION_REQUIRED");
  assert.equal(writes, 0);
  assert.equal(calls, before);
  });

  for (const blockingMode of ["HOLD", "REJECT", "MALFORMED", "EXPIRED", "CONFIRMATION", "AUTH_FAILURE"] as const) {
    test(`${blockingMode} CerbaSeal response blocks provider execution`, { concurrency: false }, async () => {
      mode = blockingMode;
      const { result, writes } = await attempt();
      assert.equal(result.executed, false);
      assert.equal(writes, 0);
      assert.ok(result.reason.length > 0);
    });
  }

  test("CerbaSeal unavailable blocks provider execution", { concurrency: false }, async () => {
    const configured = process.env.CERBASEAL_BASE_URL;
    delete process.env.CERBASEAL_BASE_URL;
    const { result, writes } = await attempt();
    process.env.CERBASEAL_BASE_URL = configured;
    assert.equal(result.executed, false);
    assert.equal(result.reason, "CERBASEAL_UNAVAILABLE");
    assert.equal(writes, 0);
  });

  test("a replayed CerbaSeal authorization never reaches the provider writer", { concurrency: false }, async () => {
    mode = "REPLAY";
    const first = await attempt();
    const second = await attempt();
    assert.equal(first.result.executed, true);
    assert.equal(first.writes, 1);
    assert.equal(second.result.executed, false);
    assert.equal(second.result.reason, "REPLAYED_AUTHORIZATION");
    assert.equal(second.writes, 0);
  });

  test.after(async () => {
    await db.update(governanceRule).set({ active: false, updatedAt: new Date() }).where(eq(governanceRule.id, rule.id));
    if (previousBaseUrl === undefined) delete process.env.CERBASEAL_BASE_URL;
    else process.env.CERBASEAL_BASE_URL = previousBaseUrl;
    if (previousEvaluateEndpoint === undefined) delete process.env.CERBASEAL_EVALUATE_ENDPOINT;
    else process.env.CERBASEAL_EVALUATE_ENDPOINT = previousEvaluateEndpoint;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
}

void main();