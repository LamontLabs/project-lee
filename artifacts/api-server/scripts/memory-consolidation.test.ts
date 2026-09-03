import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { db, eventLog, memoryConsolidationPhase, memoryConsolidationRun } from "@workspace/db";
import { getRecoveryMode } from "../src/lib/recovery-modes";
import { runConsolidation } from "../src/lib/memory-consolidation";
import { getResourceState } from "../src/lib/resource";

const healthy = getRecoveryMode().mode !== "RECOVERY_MODE"
  && getRecoveryMode().mode !== "SAFE_MODE"
  && getRecoveryMode().mode !== "READ_ONLY";

test("consolidation failure injection is resumable and run-key idempotent", { skip: !healthy }, async (context) => {
  if ((await getResourceState()).overallState !== "HEALTHY") {
    context.skip("Low-priority consolidation is deferred while resources are constrained.");
    return;
  }
  const runKey = `consolidation-contract-${crypto.randomUUID()}`;
  const first = await runConsolidation({ runKey, failurePhase: "observe_changes" });
  assert.equal(first.run.status, "failed");
  assert.equal(first.run.failurePhase, "observe_changes");
  assert.equal(first.phases.find((phase) => phase.phase === "observe_changes")?.status, "failed");

  const second = await runConsolidation({ runKey, failurePhase: "observe_changes" });
  assert.equal(second.run.id, first.run.id);
  assert.equal((await db.select().from(memoryConsolidationRun).where(eq(memoryConsolidationRun.runKey, runKey))).length, 1);
  assert.equal((await db.select().from(memoryConsolidationPhase).where(and(
    eq(memoryConsolidationPhase.runId, first.run.id),
    eq(memoryConsolidationPhase.phase, "observe_changes"),
  ))).length, 1);
  assert.equal((await db.select().from(eventLog).where(and(
    eq(eventLog.eventType, "ConsolidationPhaseFailed"),
    eq(eventLog.aggregateId, `${first.run.id}:observe_changes`),
  ))).length, 1);
});