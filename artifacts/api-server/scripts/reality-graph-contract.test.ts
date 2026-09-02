import test from "node:test";
import assert from "node:assert/strict";
import { graphRelationshipInputSchema, normalizeRelationship, resolveIdentity, identityResolutionSchema } from "../src/lib/reality-graph";

test("provider-neutral relationships normalize types, provenance, state, and deduplication", () => {
  const input = graphRelationshipInputSchema.parse({
    sourceType: "Waiting Loop",
    sourceId: "00000000-0000-4000-8000-000000000001",
    targetType: "Project",
    targetId: "00000000-0000-4000-8000-000000000002",
    edgeType: "blocked_by",
    confidence: 0.64,
    sourceRef: "gmail:thread:123",
    evidenceRefs: ["event:message:456", "event:message:456"],
  });
  const normalized = normalizeRelationship(input);
  assert.equal(normalized.sourceType, "waiting_loop");
  assert.equal(normalized.targetType, "project");
  assert.equal(normalized.edgeType, "BLOCKED_BY");
  assert.equal(normalized.relationshipState, "WEAK_CANDIDATE");
  assert.deepEqual(normalized.provenance.evidenceRefs, ["gmail:thread:123", "event:message:456"]);
  assert.equal(normalized.dedupeKey, "waiting_loop:00000000-0000-4000-8000-000000000001:BLOCKED_BY:project:00000000-0000-4000-8000-000000000002");
  assert.equal(normalizeRelationship(input).dedupeKey, normalized.dedupeKey);
});

test("canonical states are owner-gated and contradiction remains explicit", () => {
  const base = {
    sourceType: "decision",
    sourceId: "00000000-0000-4000-8000-000000000003",
    targetType: "project",
    targetId: "00000000-0000-4000-8000-000000000004",
    edgeType: "PART_OF",
    sourceRef: "event:decision:789",
  };
  assert.throws(() => normalizeRelationship({ ...base, relationshipState: "CONFIRMED" }), /Owner confirmation/);
  assert.equal(normalizeRelationship({ ...base, relationshipState: "CONTRADICTED" }).relationshipState, "CONTRADICTED");
  assert.equal(normalizeRelationship({ ...base, relationshipState: "OWNER_DECLARED", ownerConfirmation: true }).relationshipState, "OWNER_DECLARED");
});

test("identity resolution produces an owner-review candidate without merging records", () => {
  const input = identityResolutionSchema.parse({
    left: { objectType: "person", objectId: "00000000-0000-4000-8000-000000000005", provider: "gmail", externalId: "a", label: "Ada Example", email: "ADA@example.com" },
    right: { objectType: "person", objectId: "00000000-0000-4000-8000-000000000006", provider: "calendar", externalId: "b", label: "Ada Example", email: "ada@example.com" },
  });
  const result = resolveIdentity(input);
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.requiresOwnerConfirmation, true);
  assert.ok(result.reasons.includes("exact normalized email"));
  assert.ok(result.candidate >= 0.75);
});