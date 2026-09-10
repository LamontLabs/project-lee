import assert from "node:assert/strict";
import test from "node:test";
import {
  deliveryEvidenceSignature,
  deliveryEvidenceSignatureMatches,
} from "../src/lib/delivery-evidence";

test("delivery evidence accepts only the configured HMAC signature", () => {
  const previous = process.env.DELIVERY_EVIDENCE_HMAC_SECRET;
  process.env.DELIVERY_EVIDENCE_HMAC_SECRET = "delivery-evidence-contract-secret";
  const body = JSON.stringify({
    signal: "deployment",
    status: "healthy",
    source: "replit-deployment",
    observedAt: "2026-09-09T12:00:00.000Z",
    detail: "Deployment health probe passed.",
  });
  const signature = deliveryEvidenceSignature(body);

  assert.ok(signature);
  assert.equal(deliveryEvidenceSignatureMatches(body, signature), true);
  assert.equal(deliveryEvidenceSignatureMatches(body, `sha256=${signature}`), true);
  assert.equal(deliveryEvidenceSignatureMatches(`${body} `, signature), false);
  assert.equal(deliveryEvidenceSignatureMatches(body, "not-a-signature"), false);

  if (previous === undefined) delete process.env.DELIVERY_EVIDENCE_HMAC_SECRET;
  else process.env.DELIVERY_EVIDENCE_HMAC_SECRET = previous;
});