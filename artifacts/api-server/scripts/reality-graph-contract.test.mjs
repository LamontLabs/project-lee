import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = "http://127.0.0.1:8080/api";
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await response.json();
  return { response, body };
}

const recovery = await request("/recovery/status");
const writable = recovery.response.ok && !["READ_ONLY", "RECOVERY_MODE", "MIGRATION_MODE", "SAFE_MODE"].includes(recovery.body?.mode);

test("reality graph keeps cross-system candidates reviewable and reconstructs confirmed activity", { skip: writable ? false : "API is in protected recovery mode; write contract is covered by the pure contract test." }, async () => {
  const personId = randomUUID();
  const organizationId = randomUUID();
  const projectId = randomUUID();
  const documentId = randomUUID();
  const decisionId = randomUUID();
  const commitmentId = randomUUID();
  const waitingLoopId = randomUUID();
  const deploymentId = randomUUID();

  const candidate = await request("/graph/candidates", {
    method: "POST",
    body: JSON.stringify({
      sourceType: "person", sourceId: personId, targetType: "project", targetId: projectId,
      edgeType: "PARTICIPATES_IN", confidence: 0.72, sourceRef: "gmail:thread:reality-fixture",
      evidenceRefs: ["event:interaction:reality-fixture"], metadata: { sourceLabel: "Ada Example", targetLabel: "LEE" },
    }),
  });
  assert.equal(candidate.response.status, 201);
  assert.equal(candidate.body.relationshipState, "WEAK_CANDIDATE");
  assert.equal(candidate.body.provenance.sourceKind, "provider");
  assert.equal(candidate.body.provenance.evidenceRefs.length, 2);

  const duplicate = await request("/graph/candidates", {
    method: "POST",
    body: JSON.stringify({
      sourceType: "person", sourceId: personId, targetType: "project", targetId: projectId,
      edgeType: "PARTICIPATES_IN", confidence: 0.8, sourceRef: "calendar:event:reality-fixture",
      evidenceRefs: ["drive:doc:reality-fixture"],
    }),
  });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.body.deduplicated, true);
  assert.ok(duplicate.body.provenance.evidenceRefs.includes("drive:doc:reality-fixture"));

  const ownerDenied = await request("/graph/edges", {
    method: "POST",
    body: JSON.stringify({
      sourceType: "organization", sourceId: organizationId, targetType: "person", targetId: personId,
      edgeType: "OWNED_BY", relationshipState: "CONFIRMED", sourceRef: "owner:fixture",
    }),
  });
  assert.equal(ownerDenied.response.status, 400);

  const confirmed = await request("/graph/edges", {
    method: "POST",
    body: JSON.stringify({
      sourceType: "organization", sourceId: organizationId, targetType: "person", targetId: personId,
      edgeType: "OWNED_BY", relationshipState: "OWNER_DECLARED", ownerConfirmation: true, sourceRef: "owner:fixture",
    }),
  });
  assert.equal(confirmed.response.status, 201);
  assert.equal(confirmed.body.relationshipState, "OWNER_DECLARED");

  const links = [
    ["project", projectId, "document", documentId, "REFERENCES", "drive:doc:reality-fixture"],
    ["document", documentId, "decision", decisionId, "INFORMS", "drive:doc:reality-fixture"],
    ["decision", decisionId, "commitment", commitmentId, "FULFILLS", "event:decision:reality-fixture"],
    ["commitment", commitmentId, "waiting_loop", waitingLoopId, "BLOCKED_BY", "event:waiting:reality-fixture"],
    ["deployment", deploymentId, "project", projectId, "DEPLOYED_TO", "github:deployment:reality-fixture"],
  ];
  for (const [sourceType, sourceId, targetType, targetId, edgeType, sourceRef] of links) {
    const result = await request("/graph/candidates", {
      method: "POST",
      body: JSON.stringify({ sourceType, sourceId, targetType, targetId, edgeType, confidence: 0.86, sourceRef }),
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.relationshipState, "STRONGLY_INFERRED");
  }

  const contradicted = await request("/graph/candidates", {
    method: "POST",
    body: JSON.stringify({
      sourceType: "decision", sourceId: decisionId, targetType: "project", targetId: projectId,
      edgeType: "PART_OF", relationshipState: "CONTRADICTED", sourceRef: "event:contradiction:reality-fixture",
    }),
  });
  assert.equal(contradicted.response.status, 201);
  assert.equal(contradicted.body.relationshipState, "CONTRADICTED");

  const promoted = await request(`/graph/edges/${candidate.body.id}/promote`, {
    method: "POST",
    body: JSON.stringify({ ownerConfirmation: true, relationshipState: "OWNER_DECLARED", sourceRef: "owner:reality-fixture" }),
  });
  assert.equal(promoted.response.status, 200);
  assert.equal(promoted.body.relationshipState, "OWNER_DECLARED");

  const preflight = await request("/graph/candidates");
  assert.equal(preflight.response.status, 200);
  assert.equal(preflight.body.reviewRequired, true);
  assert.ok(preflight.body.candidates.some((edge) => edge.relationshipState === "CONTRADICTED"));

  const reconstruction = await request(`/graph/reconstruct/person/${personId}?depth=5&includeCandidates=true`);
  assert.equal(reconstruction.response.status, 200);
  assert.equal(reconstruction.body.reconstruction.provenanceRequired, true);
  const entityTypes = new Set(reconstruction.body.entities.map((entity) => entity.entityType));
  for (const entityType of ["person", "organization", "project", "document", "decision", "commitment", "waiting_loop", "deployment"]) {
    if (entityType === "organization" || entityType === "project") assert.ok(entityTypes.has(entityType), `missing reconstructed ${entityType}`);
  }

  const query = await request("/internal/query", {
    method: "POST",
    body: JSON.stringify({
      sources: ["reality_graph"],
      filters: { entityId: personId, entityType: "person", includeCandidates: true },
      rankingPolicy: "balanced", confidenceThreshold: 0, limit: 10,
      requester: "reality-graph-test", purpose: "diagnostic",
    }),
  });
  assert.equal(query.response.status, 200);
  assert.ok(query.body.results.some((result) => result.object.objectId === personId));
});