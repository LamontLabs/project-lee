import type { RequestHandler } from "express";
import { getRecoveryMode } from "../lib/recovery-modes";

export const recoveryModeGuard: RequestHandler = (req, res, next) => {
  const { mode } = getRecoveryMode();
  const blockedMode = ["READ_ONLY", "RECOVERY_MODE", "MIGRATION_MODE", "SAFE_MODE"].includes(mode);
  const safeRecoveryWrite = /\/recovery\/|\/auth\/|\/health|\/backups(?:\/|$)/.test(req.path);
  const safeRecoveryRead = req.method === "POST" && req.path === "/api/internal/query";
  if (blockedMode && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !safeRecoveryWrite && !safeRecoveryRead) {
    res.status(423).json({
      error: mode === "RECOVERY_MODE"
        ? "Lee is in Recovery Mode. Writes are disabled until the canonical Brain is verified."
        : "Lee is in a protected recovery mode. Write operations are disabled.",
      recoveryMode: mode,
      proof: getRecoveryMode().proof,
    });
    return;
  }
  next();
};