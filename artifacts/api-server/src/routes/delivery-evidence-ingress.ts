import { Router } from "express";
import { deliveryEvidenceSignatureMatches, recordDeliveryEvidence } from "../lib/delivery-evidence";

const router = Router();

router.post("/bootstrap-awareness/delivery-evidence", async (req, res): Promise<void> => {
  const signature = req.header("x-delivery-evidence-signature") ?? req.header("x-hub-signature-256");
  const body = JSON.stringify(req.body ?? {});
  if (!process.env.DELIVERY_EVIDENCE_HMAC_SECRET) {
    res.status(503).json({ error: "Delivery evidence ingress is not configured; the signal remains unverified." });
    return;
  }
  if (!deliveryEvidenceSignatureMatches(body, signature)) {
    res.status(401).json({ error: "A valid delivery evidence signature is required." });
    return;
  }
  try {
    const record = await recordDeliveryEvidence(req.body ?? {});
    res.status(201).json({ accepted: true, evidenceId: record?.id ?? null });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Delivery evidence could not be recorded." });
  }
});

export default router;