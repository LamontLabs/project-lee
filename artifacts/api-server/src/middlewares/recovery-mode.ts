import type { RequestHandler } from "express";
import { getRecoveryMode } from "../lib/recovery-modes";

export const recoveryModeGuard: RequestHandler = (req, res, next) => {
  const { mode } = getRecoveryMode();
  if (mode === "READ_ONLY" && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !/\/recovery\/|\/auth\/|\/health/.test(req.path)) {
    res.status(423).json({ error: "Lee is in Read Only Mode. Write operations are disabled.", recoveryMode: mode });
    return;
  }
  next();
};