import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../src/lib/", import.meta.url);
const prohibited = {
  "context-engine.ts": ["waitingLoop", "trustScore", "strategicObjective", "constitutionProvision", "assumptionLedger"],
  "operational-intelligence.ts": ["initiativeItem", "universalObject"],
  "operational-memory.ts": ["behavioralSignal", "operationalPattern"],
  "portfolio-intelligence.ts": ["bootstrapRun", "opportunity", "strategicAnchor", "universalObject", "eventLog", "person"],
};

test("intelligence engines use Query Engine for canonical knowledge reads", async () => {
  for (const [name, tableNames] of Object.entries(prohibited)) {
    const source = await readFile(new URL(name, root), "utf8");
    assert.match(source, /queryEngine\.query\(/, `${name} must call Query Engine`);
    for (const table of tableNames) {
      assert.doesNotMatch(source, new RegExp(`db\\.select\\([^\\n]*\\)\\.from\\(${table}\\)`), `${name} directly reads ${table}`);
    }
  }
});

test("institutional retrieval is gateway-backed, not a direct ledger read", async () => {
  const source = await readFile(new URL("experience.ts", root), "utf8");
  const listStart = source.indexOf("export async function listInstitutionalKnowledge");
  const reviewStart = source.indexOf("export async function reviewInstitutionalKnowledge", listStart);
  const listBody = source.slice(listStart, reviewStart);
  assert.match(listBody, /sources:\s*\["institutional_knowledge"\]/);
  assert.doesNotMatch(listBody, /db\.select\(\)\.from\(institutionalKnowledgeLedger\)/);
});

test("Query Engine returns policy and epistemic evidence metadata", async () => {
  const response = await fetch("http://127.0.0.1:8080/api/internal/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sources: ["facts", "interpretations", "assumptions"],
      filters: {},
      rankingPolicy: "balanced",
      confidenceThreshold: 0,
      limit: 20,
      requester: "Query Engine architecture test",
      purpose: "architecture_validation",
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.results));
  for (const result of payload.results) {
    assert.equal(result.evidence.authorization, "constitution");
    assert.ok(["fact", "interpretation", "assumption"].includes(result.evidence.epistemic_type));
    assert.equal(typeof result.evidence.freshness, "number");
    assert.equal(typeof result.evidence.trust, "number");
    assert.equal(typeof result.why_included.base_score, "number");
  }
});