import { Router, type IRouter, type Request } from "express";
import { db, bootHistory, recoveryAgenda } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getRecoveryMode, recordCleanShutdown, resolveAgenda } from "../lib/recovery-modes";
import { ownerExists } from "../lib/owner-auth";
import { cookieName, isValidSession } from "../middlewares/private-auth";

const router: IRouter = Router();
function hasOwnerSession(req: Request) {
  const raw = req.headers.cookie?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return ownerExists() && isValidSession(raw);
}

router.get("/recovery/status", (req, res) => {
  const status = getRecoveryMode();
  if (hasOwnerSession(req)) {
    res.setHeader("Cache-Control", "no-store");
    res.json(status);
    return;
  }
  const proof = status.proof;
  res.setHeader("Cache-Control", "no-store");
  res.json({
    mode: status.mode,
    reason: status.reason,
    agenda: status.agenda ? {
      status: status.agenda.status,
      issueCount: status.agenda.issues.length,
    } : null,
    proof: proof ? {
      overall: proof.overall,
      checkedAt: proof.checkedAt,
      databaseIdentity: {
        result: proof.databaseIdentity.result,
        reason: proof.databaseIdentity.reason,
      },
      brain: {
        result: proof.brain.result,
        status: proof.brain.status,
        reason: proof.brain.reason,
      },
      eventLog: {
        result: proof.eventLog.result,
        verifierVersion: proof.eventLog.verifierVersion,
        eventCount: proof.eventLog.eventCount,
        rowsExamined: proof.eventLog.rowsExamined,
        scanComplete: proof.eventLog.scanComplete,
        snapshotCurrentAtVerification: proof.eventLog.snapshotCurrentAtVerification,
        replicaLockWaitMs: proof.eventLog.replicaLockWaitMs,
        eventLogLockWaitMs: proof.eventLog.eventLogLockWaitMs,
        eventLogLockHoldMs: proof.eventLog.eventLogLockHoldMs,
        scanDurationMs: proof.eventLog.scanDurationMs,
        verificationDurationMs: proof.eventLog.verificationDurationMs,
        proofDeadlineMs: proof.eventLog.proofDeadlineMs,
        findingCount: proof.eventLog.gaps.length,
        findingsComplete: proof.eventLog.findingsComplete,
        boundaryTransactionRows: proof.eventLog.boundaryTransactionRows,
        frozenXidRows: proof.eventLog.frozenXidRows,
        allocatorBoundaryRecorded: proof.eventLog.allocatorBoundaryRecorded,
        ambiguousLegacyAggregates: proof.eventLog.ambiguousLegacyAggregates,
        postCutoverViolations: proof.eventLog.postCutoverViolations,
        reason: proof.eventLog.reason,
      },
      issues: proof.issues,
    } : null,
  });
});
router.get("/recovery/boot-history", async (_req, res) => res.json(await db.select().from(bootHistory).orderBy(desc(bootHistory.startedAt)).limit(20)));
router.get("/recovery/agenda", async (_req, res) => res.json(await db.select().from(recoveryAgenda).orderBy(desc(recoveryAgenda.createdAt)).limit(20)));
router.post("/recovery/clean-shutdown", async (req, res) => res.status(201).json(await recordCleanShutdown(String(req.body?.sessionId ?? crypto.randomUUID()))));
router.post("/recovery/agenda/:id/resolve", async (req, res): Promise<void> => {
  if (!ownerExists()) {
    res.status(428).json({ error: "Owner enrollment is required before recovery can be resolved.", enrollmentRequired: true });
    return;
  }
  if (!hasOwnerSession(req)) {
    res.status(401).json({ error: "A valid owner session is required to resolve recovery." });
    return;
  }
  const result = await resolveAgenda(req.params.id);
  if (result.status === "blocked") {
    res.status(409).json({
      error: "Recovery cannot be resolved until the current full startup proof passes.",
      proof: result.proof,
    });
    return;
  }
  if (result.status === "not_found") {
    res.status(404).json({ error: "Recovery agenda item was not found.", agendaId: req.params.id });
    return;
  }
  res.json({
    ...result.agenda,
    recoveryMode: "RECOVERY_MODE",
    restartRequired: true,
    proof: result.proof,
  });
});
export default router;