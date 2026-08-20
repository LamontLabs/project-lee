import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, eventLog, operationalAdaptation } from "@workspace/db";
import { APPROVED_ADAPTATION_PARAMETERS, getAdaptedParameter, listSelfImprovement, requestAdaptation, resetSelfImprovement } from "../src/lib/self-improvement";

test("self-improvement only adapts approved output parameters with durable rollback evidence", async () => {
  await db.delete(operationalAdaptation).where(eq(operationalAdaptation.parameter, "brief_item_ceiling"));
  const evidenceRefs = Array.from({ length: 5 }, () => randomUUID());
  assert.ok(APPROVED_ADAPTATION_PARAMETERS.includes("brief_item_ceiling"));
  const applied = await requestAdaptation({
    category: "briefs",
    parameter: "brief_item_ceiling",
    newValue: "7",
    evidenceRefs,
    reason: "Controlled evidence shows shorter briefs improve completion.",
  });
  assert.equal(applied.status, "active");
  assert.equal(applied.currentValue, "7");
  assert.deepEqual(applied.rollbackData.previousValue, "10");
  assert.deepEqual(applied.rollbackData.evidenceRefs, evidenceRefs);
  assert.equal(await getAdaptedParameter("brief_item_ceiling", "10"), "7");

  await assert.rejects(
    requestAdaptation({ category: "identity", parameter: "identity", newValue: "changed", evidenceRefs, reason: "Must never be allowed." }),
    /protected target/,
  );
  await assert.rejects(
    requestAdaptation({ category: "briefs", parameter: "brief_item_ceiling", newValue: "6", evidenceRefs: evidenceRefs.slice(0, 4), reason: "Not enough independent evidence." }),
    /At least 5 evidence references/,
  );
  await assert.rejects(
    requestAdaptation({ category: "facts", parameter: "facts", newValue: "changed", evidenceRefs, reason: "Protected knowledge boundary." }),
    /protected target/,
  );

  const reset = await resetSelfImprovement(applied.id);
  assert.equal(reset[0].status, "disabled");
  assert.equal(reset[0].currentValue, "10");
  assert.equal(await getAdaptedParameter("brief_item_ceiling", "10"), "10");
  await assert.rejects(
    requestAdaptation({ category: "briefs", parameter: "brief_item_ceiling", newValue: "6", evidenceRefs, reason: "Disabled adaptations cannot silently reactivate." }),
    /disabled/,
  );

  const reloaded = (await listSelfImprovement()).find((item) => item.id === applied.id);
  assert.equal(reloaded?.status, "disabled");
  assert.equal(reloaded?.rollbackData.defaultValue, "10");
  const events = await db.select().from(eventLog).where(and(
    eq(eventLog.aggregateType, "operational_adaptation"),
    inArray(eventLog.eventType, ["OperationalAdaptationApplied", "OperationalAdaptationRejected"]),
  ));
  assert.ok(events.some((event) => event.eventType === "OperationalAdaptationApplied" && event.aggregateId === applied.id));
  assert.ok(events.some((event) => event.eventType === "OperationalAdaptationRejected" && (event.payload as Record<string, unknown>).protectedTarget === true));
});