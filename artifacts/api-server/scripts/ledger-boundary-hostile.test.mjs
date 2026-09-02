import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = "http://127.0.0.1:8080/api";
async function post(path, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function json(response) {
  return response.json();
}

test("Fact and Interpretation ledgers reject hostile boundary bypasses", async () => {
  const sourceResponse = await post("/sources", {
    originalFilename: `hostile-ledger-${Date.now()}.txt`,
    mimeType: "text/plain",
    checksum: randomUUID().replaceAll("-", ""),
    byteSize: 32,
  });
  assert.equal(sourceResponse.status, 201);
  const source = await json(sourceResponse);

  const missingProvenance = await post("/facts", {
    subject: "test", predicate: "status", object: "observed",
    factType: "observed", confidence: 0.8,
  });
  assert.equal(missingProvenance.status, 400);

  const fakeProvenance = await post("/facts", {
    subject: "test", predicate: "status", object: "observed",
    factType: "observed", sourceEvidence: [randomUUID()], confidence: 0.8,
  });
  assert.equal(fakeProvenance.status, 400);

  const mixedFact = await post("/facts", {
    subject: "test", predicate: "status", object: "observed",
    factType: "observed", sourceEvidence: [source.id], confidence: 0.8,
    statement: "this must not become a fact",
  });
  assert.equal(mixedFact.status, 400);

  const validFactResponse = await post("/facts", {
    subject: "hostile-test", predicate: "source_exists", object: "true",
    factType: "observed", sourceEvidence: [source.id], confidence: 0.8,
  });
  assert.equal(validFactResponse.status, 201);
  const fact = await json(validFactResponse);
  assert.deepEqual(fact.sourceEvidence, [source.id]);

  const missingInterpretationMetadata = await post("/interpretations", {
    statement: "The source supports a conclusion.",
    interpretationType: "inference",
    inputFacts: [fact.id],
    confidence: 0.7,
  });
  assert.equal(missingInterpretationMetadata.status, 400);

  const fakeEvidence = await post("/interpretations", {
    statement: "The source supports a conclusion.",
    interpretationType: "inference",
    inputFacts: [randomUUID()],
    confidence: 0.7,
    generatedBy: { engineId: "hostile-test" },
    generatedByEngine: "hostile-test",
    whyChain: [
      { step_type: "fact_confirmed", evidence_id: source.id, confidence: 0.7 },
      { step_type: "strategy_alignment", evidence_id: source.id, confidence: 0.7 },
    ],
  });
  assert.equal(fakeEvidence.status, 400);

  const mixedInterpretation = await post("/interpretations", {
    statement: "The source supports a conclusion.",
    interpretationType: "inference",
    inputFacts: [fact.id],
    confidence: 0.7,
    generatedBy: { engineId: "hostile-test" },
    generatedByEngine: "hostile-test",
    whyChain: [
      { step_type: "fact_confirmed", evidence_id: fact.id, confidence: 0.7 },
      { step_type: "strategy_alignment", evidence_id: source.id, confidence: 0.7 },
    ],
    sourceEvidence: [source.id],
  });
  assert.equal(mixedInterpretation.status, 400);

  const validInterpretationResponse = await post("/interpretations", {
    statement: "The source supports a conclusion.",
    interpretationType: "inference",
    inputFacts: [fact.id],
    sourceRef: source.id,
    confidence: 0.7,
    generatedBy: { engineId: "hostile-test", runId: randomUUID() },
    generatedByEngine: "hostile-test",
    whyChain: [
      { step_type: "fact_confirmed", statement: "A source-backed fact supports this.", evidence_id: fact.id, confidence: 0.8, engine_name: "hostile-test" },
      { step_type: "strategy_alignment", statement: "The conclusion is explicitly bounded as interpretation.", evidence_id: source.id, confidence: 0.7, engine_name: "hostile-test" },
    ],
  });
  assert.equal(validInterpretationResponse.status, 201);
  const interpretation = await json(validInterpretationResponse);
  assert.equal(interpretation.generatedBy.engineId, "hostile-test");
  assert.equal(interpretation.whyChain.length, 2);

  const forbiddenPromotion = await post(`/interpretations/${interpretation.id}/promote`, {});
  assert.equal(forbiddenPromotion.status, 409);
});