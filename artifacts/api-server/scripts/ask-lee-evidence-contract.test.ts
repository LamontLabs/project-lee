import assert from "node:assert/strict";
import test from "node:test";
import { buildAskAnswerContract, sanitizeCILResponse, sanitizeContextPacket } from "../src/lib/ask-lee-evidence";
import type { SelectedContext } from "../src/lib/context-economy";
import { querySpecSchema } from "../src/lib/query-engine";

function item(overrides: Partial<SelectedContext>): SelectedContext {
  return {
    id: "evidence-1",
    text: "A source-backed record.",
    kind: "fact",
    confidence: 0.9,
    recencyDays: 1,
    strategicAnchor: false,
    score: 1,
    contextValueScore: 1,
    factorBreakdown: {},
    estimatedTokens: 20,
    ...overrides,
  };
}

const cil = {
  correlation_id: "correlation-1",
  resolution_tier: "T3_FRONTIER" as const,
  answer: "The answer is grounded.",
  confidence: 0.82,
  cost_usd: 0.02,
  latency_ms: 40,
  semantic_domain: "conversation",
  reuse_eligible: false,
  drift_detected: false,
  contradiction_detected: false,
  provenance: ["cil:asset:1"],
  freshness_state: "current" as const,
  recommend_escalation: false,
};

test("Ask LEE contract keeps cross-domain evidence and epistemic labels separate", () => {
  const items = [
    item({ id: "fact-1", kind: "fact", text: "The project has a dated milestone." }),
    item({ id: "interpretation-1", kind: "interpretation", text: "LEE interprets the milestone as at risk." }),
    item({ id: "assumption-1", kind: "assumption", text: "Assumption · the vendor will respond this week." }),
    item({ id: "person-1", kind: "person", text: "Avery · relationship health current." }),
    item({ id: "project-1", kind: "project", text: "Project Atlas · active." }),
    item({ id: "commitment-1", kind: "commitment", text: "Commitment · owner will review." }),
    item({ id: "cost-1", kind: "cost", text: "Cost observation · $0.0200." }),
    item({ id: "governance-1", kind: "governance", text: "Governance · model_call · HOLD." }),
    item({ id: "system-1", kind: "system", text: "System · CIL · health degraded." }),
    item({ id: "conflict-1", kind: "contradiction", text: "Contradiction · two records disagree." }),
  ];
  const result = buildAskAnswerContract({
    answer: "The answer is grounded.",
    items,
    cil,
    route: { tier: "T3", model: "frontier-model", provider: "provider-a", routeId: "route-1" },
    intentType: "question_exploratory",
  });
  assert.equal(result.version, "ask-lee.v1");
  assert.equal(result.presentation, "compact_with_expandable_details");
  assert.equal(result.compact.evidenceCount, items.length);
  assert.equal(result.evidence.find((entry) => entry.id === "fact-1")?.epistemicType, "fact");
  assert.equal(result.evidence.find((entry) => entry.id === "interpretation-1")?.epistemicType, "interpretation");
  assert.equal(result.assumptions.length, 1);
  assert.equal(result.contradictions.detected, true);
  assert.ok(["people", "projects", "changes", "costs", "governance", "systems"].every((domain) => result.domainCards.some((card) => card.domain === domain)));
  assert.equal(result.cilRoute.routeSelectedBy, "CIL");
  assert.equal(result.cilRoute.localModelSelection, false);
  assert.equal(result.cilRoute.routeId, "route-1");
  assert.deepEqual(result.provenance.cilProvenance, ["cil:asset:1"]);
});

test("Query Engine accepts one bounded cross-domain retrieval request for Ask LEE", () => {
  const parsed = querySpecSchema.parse({
    sources: ["people", "universal_objects", "facts", "interpretations", "commitments", "cost_records", "governance_requests", "internal_services", "memory_conflicts"],
    filters: {},
    rankingPolicy: "context_assembly",
    confidenceThreshold: 0,
    limit: 50,
    requester: "Ask LEE evidence contract test",
    purpose: "context_assembly",
  });
  assert.equal(parsed.sources.length, 9);
  assert.ok(parsed.sources.includes("cost_records"));
  assert.ok(parsed.sources.includes("governance_requests"));
  assert.ok(parsed.sources.includes("internal_services"));
  assert.ok(parsed.sources.includes("memory_conflicts"));
});

test("default Ask LEE presentation suppresses raw provider bodies and technical payload text", () => {
  const email = item({
    id: "gmail:thread:1",
    kind: "email_thread",
    text: "Gmail · Email thread\nSELECTED_PRIVATE_BODY access_token=not-for-ui",
    provider: "gmail",
    sourceRef: "gmail:thread:1",
  });
  const packet = sanitizeContextPacket({ fingerprint: "hash", reused: false, items: [email], excluded: [], tokens: 10, excludedRefs: [] });
  assert.equal(packet.items[0].text, "Provider content is withheld from the default context preview.");
  assert.equal(packet.items[0].rawContentSuppressed, true);
  assert.doesNotMatch(JSON.stringify(packet), /SELECTED_PRIVATE_BODY|access_token/);
  const result = buildAskAnswerContract({ answer: "Email context was considered.", items: [email], route: { tier: "T1", model: "CIL", provider: "cil", routeId: null } });
  assert.equal(result.evidence[0].excerpt, undefined);
  assert.equal(result.evidence[0].rawContentSuppressed, true);
});

test("route preview omits the CIL answer body while preserving route evidence", () => {
  const safe = sanitizeCILResponse(cil);
  assert.equal("answer" in safe, false);
  assert.equal(safe.resolution_tier, "T3_FRONTIER");
  assert.deepEqual(safe.provenance, ["cil:asset:1"]);
});

test("stale context is labeled and CIL route provenance remains expandable", () => {
  const result = buildAskAnswerContract({
    answer: "Some context is aging.",
    items: [item({ id: "old-fact", recencyDays: 120, ageState: "STALE" })],
    cil: { ...cil, resolution_tier: "T2_SEMANTIC", freshness_state: "stale", provenance: ["cil:reuse:7"] },
    route: { tier: "T2", model: "CIL", provider: "cil", routeId: null },
  });
  assert.equal(result.freshness.state, "stale");
  assert.equal(result.freshness.staleCount, 1);
  assert.equal(result.evidence[0].freshness, "stale");
  assert.equal(result.cilRoute.resolutionTier, "T2_SEMANTIC");
  assert.equal(result.provenance.cilProvenance[0], "cil:reuse:7");
});