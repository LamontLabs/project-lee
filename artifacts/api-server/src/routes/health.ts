import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { API_BUILD_ID, EVENT_LOG_VERIFIER_VERSION } from "../lib/build-info";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, buildId: API_BUILD_ID, eventLogVerifierVersion: EVENT_LOG_VERIFIER_VERSION });
});

export default router;
