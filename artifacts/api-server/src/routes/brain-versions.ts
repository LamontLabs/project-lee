import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  CreateBrainVersionBody,
  CreateBrainVersionResponse,
  ListBrainVersionsResponse,
  RestoreBrainVersionBody,
  RestoreBrainVersionResponse,
} from "@workspace/api-zod";
import {
  anchorLedger,
  assumptionLedger,
  brainVersion,
  connector,
  connectorSync,
  costRecord,
  decisionHeuristicLedger,
  db,
  eventLog,
  executiveObjective,
  executiveObjectiveEvidence,
  factLedger,
  identityProfile,
  identityProfileVersion,
  institutionalKnowledgeLedger,
  organizationalProfile,
  organizationalResource,
  interpretationLedger,
  normalizedConnectorEvent,
  provenanceRecord,
  understandingRun,
  founderProfile,
  founderProfileHistory,
  founderProfileCorrection,
  universalObject,
  graphNode,
  graphEdge,
  trustScore,
  trustEvent,
  strategicObjective,
  strategyReview,
  simulation,
  reflectionReport,
  reflectionMetric,
  correction,
  standingCorrectionRule,
  learningAsset,
  modeConfig,
  modeHistory,
  workspaceState,
  relationshipPromise,
  relationshipQuestion,
  relationshipHealthScore,
  constitutionProvision,
  constitutionVersion,
  constitutionConsultation,
  constitutionViolation,
  observation,
  opportunity,
} from "@workspace/db";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const snapshotTables = {
  anchorLedger,
  assumptionLedger,
  connector,
  connectorSync,
  costRecord,
  decisionHeuristicLedger,
  eventLog,
  executiveObjective,
  executiveObjectiveEvidence,
  factLedger,
  identityProfile,
  identityProfileVersion,
  institutionalKnowledgeLedger,
  organizationalProfile,
  organizationalResource,
  interpretationLedger,
  normalizedConnectorEvent,
  provenanceRecord,
  understandingRun,
  founderProfile,
  founderProfileHistory,
  founderProfileCorrection,
  universalObject,
  graphNode,
  graphEdge,
  trustScore,
  trustEvent,
  strategicObjective,
  strategyReview,
  simulation,
  reflectionReport,
  reflectionMetric,
  correction,
  standingCorrectionRule,
  learningAsset,
  modeConfig,
  modeHistory,
  workspaceState,
  relationshipPromise,
  relationshipQuestion,
  relationshipHealthScore,
  constitutionProvision,
  constitutionVersion,
  constitutionConsultation,
  constitutionViolation,
  observation,
  opportunity,
} as const;

type SnapshotPayload = Record<string, unknown>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function checksum(payload: SnapshotPayload): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(payload)))
    .digest("hex");
}

async function collectSnapshot(): Promise<{ payload: SnapshotPayload; recordCounts: Record<string, number> }> {
  const entries = await Promise.all(
    Object.entries(snapshotTables).map(async ([name, table]) => {
      const rows = await db.select().from(table);
      return [name, rows] as const;
    }),
  );
  const payload = Object.fromEntries(entries) as SnapshotPayload;
  const recordCounts = Object.fromEntries(
    entries.map(([name, rows]) => [name, rows.length]),
  );
  return { payload, recordCounts };
}

router.post("/brain-versions", async (req, res): Promise<void> => {
  const parsed = CreateBrainVersionBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { payload, recordCounts } = await collectSnapshot();
  const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0);
  const digest = checksum(payload);
  const now = new Date();
  const versionName = parsed.data.versionName ?? `brain-${now.toISOString().replace(/[:.]/g, "-")}`;

  const result = await db.transaction(async (tx) => {
    const [version] = await tx
      .insert(brainVersion)
      .values({
        versionName,
        schemaVersion: "1",
        status: "verified",
        checksum: digest,
        payload,
        recordCounts,
        totalRecords,
        createdAt: now,
        verifiedAt: now,
      })
      .returning();
    const [event] = await tx
      .insert(eventLog)
      .values({
        eventType: "BrainVersionCreated",
        aggregateType: "brain_version",
        aggregateId: version.id,
        sourceRef: `brain-version:${version.id}`,
        occurredAt: now,
        payload: {
          versionId: version.id,
          versionName,
          checksum: digest,
          totalRecords,
          recordCounts,
        },
      })
      .returning();
    return { version, eventId: event.id };
  });

  res.status(201).json(
    CreateBrainVersionResponse.parse({
      ...result.version,
      eventId: result.eventId,
    }),
  );
});

router.get("/brain-versions", async (_req, res): Promise<void> => {
  const versions = await db
    .select({
      id: brainVersion.id,
      versionName: brainVersion.versionName,
      schemaVersion: brainVersion.schemaVersion,
      status: brainVersion.status,
      checksum: brainVersion.checksum,
      totalRecords: brainVersion.totalRecords,
      createdAt: brainVersion.createdAt,
      verifiedAt: brainVersion.verifiedAt,
    })
    .from(brainVersion)
    .orderBy(desc(brainVersion.createdAt));
  res.json(ListBrainVersionsResponse.parse(versions));
});

router.post("/brain-versions/:id/restore", async (req, res): Promise<void> => {
  const paramsId = req.params.id;
  const parsed = RestoreBrainVersionBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [version] = await db
    .select()
    .from(brainVersion)
    .where(eq(brainVersion.id, paramsId))
    .limit(1);
  if (!version) {
    res.status(404).json({ error: "Brain version not found." });
    return;
  }

  const checksumValid = checksum(version.payload) === version.checksum;
  const now = new Date();
  const [event] = await db
    .insert(eventLog)
    .values({
      eventType: "RestoreInitiated",
      aggregateType: "brain_version",
      aggregateId: version.id,
      sourceRef: `brain-version:${version.id}`,
      occurredAt: now,
      payload: {
        versionId: version.id,
        checksumValid,
        confirmed: parsed.data.confirm ?? false,
        dryRun: true,
        totalRecords: version.totalRecords,
      },
    })
    .returning();

  res.json(
    RestoreBrainVersionResponse.parse({
      id: version.id,
      checksumValid,
      status: checksumValid ? "verified" : "checksum_mismatch",
      dryRun: true,
      message: checksumValid
        ? "Snapshot verified. Restore preflight completed without mutating immutable history."
        : "Snapshot checksum mismatch. Restore was not attempted.",
      eventId: event.id,
    }),
  );
});

export default router;