import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createApiClient } from "./test-support/http.mjs";

const api = createApiClient();
const DAY_MS = 24 * 60 * 60 * 1000;

async function createProject() {
  return api.post("/api/objects", {
    objectType: "project",
    name: `Allocation lifecycle test ${randomUUID()}`,
  });
}

async function createOverride(projectId, expiresAt, percentage = 50) {
  return api.post("/api/resource-allocation/overrides", {
    projectId,
    percentage,
    reason: "Allocation lifecycle test",
    expiresAt: expiresAt.toISOString(),
  });
}

async function releaseOverride(id) {
  const response = await fetch(`${api.baseUrl}/api/resource-allocation/overrides/${id}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 200);
  return response.json();
}

test("allocation override status changes at the seven-day reminder boundary", async () => {
  const project = await createProject();
  const now = Date.now();
  const overrides = await Promise.all([
    createOverride(project.id, new Date(now + 8 * DAY_MS), 40),
    createOverride(project.id, new Date(now + 7 * DAY_MS), 45),
    createOverride(project.id, new Date(now - 1), 55),
  ]);

  try {
    const statuses = await api.get("/api/resource-allocation/overrides");
    const byId = new Map(statuses.filter((item) => overrides.some((override) => override.id === item.id)).map((item) => [item.id, item]));

    assert.equal(byId.get(overrides[0].id)?.status, "active");
    assert.equal(byId.get(overrides[1].id)?.status, "expiring");
    assert.equal(byId.get(overrides[2].id)?.status, "expired");
    assert.equal(byId.get(overrides[2].id)?.daysRemaining, 0);
  } finally {
    await Promise.all(overrides.map((override) => releaseOverride(override.id)));
  }
});

test("expired overrides are excluded from computed allocation", async () => {
  const project = await createProject();
  const expired = await createOverride(project.id, new Date(Date.now() - 1), 99);

  try {
    const allocation = await api.post("/api/resource-allocation/recompute");
    const recommendation = allocation.find((item) => item.projectId === project.id);

    assert.ok(recommendation, "the test project should receive a recommendation");
    assert.notEqual(recommendation.percentage, 99);
    assert.match(recommendation.narrative, /allocation reflects momentum/i);
  } finally {
    await releaseOverride(expired.id);
  }
});

test("releasing an active override restores computed allocation", async () => {
  const project = await createProject();
  const override = await createOverride(project.id, new Date(Date.now() + 30 * DAY_MS), 88);

  try {
    const overridden = await api.post("/api/resource-allocation/recompute");
    const lockedRecommendation = overridden.find((item) => item.projectId === project.id);
    assert.equal(lockedRecommendation?.percentage, 88);
    assert.match(lockedRecommendation?.narrative ?? "", /owner override/i);

    await releaseOverride(override.id);
    const restored = await api.post("/api/resource-allocation/recompute");
    const computedRecommendation = restored.find((item) => item.projectId === project.id);

    assert.ok(computedRecommendation, "the released project should receive a recommendation");
    assert.notEqual(computedRecommendation.percentage, 88);
    assert.match(computedRecommendation.narrative, /allocation reflects momentum/i);
  } finally {
    const remaining = await api.get("/api/resource-allocation/overrides");
    const found = remaining.find((item) => item.id === override.id);
    if (found) await releaseOverride(found.id);
  }
});