import { pool } from "@workspace/db";
import {
  catalogAllocatorCutoverXid,
  EventLogSequenceAnalyzer,
  EVENT_LOG_VERIFIER_VERSION,
  type EventLogSequenceFinding,
} from "./event-log-continuity";

const CURSOR_NAME = "lee_event_log_integrity_scan";
const FETCH_SIZE = 5_000;
const CAUSATION_SAMPLE_LIMIT = 1_000;
const PROOF_DEADLINE_MS = 180_000;
const STATEMENT_TIMEOUT_MS = 30_000;
const LOCK_TIMEOUT_MS = 10_000;
const TRANSACTION_ID_MODULUS = "4294967296";

type DatabaseClient = {
  query: (text: string, values?: any[]) => Promise<{ rowCount: number | null }>;
};

export type StartupProof = {
  overall: "PASS" | "FAIL";
  checkedAt: string;
  databaseIdentity: {
    result: "PASS" | "WARN" | "FAIL";
    instanceConfigured: boolean;
    identityRowCount: number;
    identityMatches: boolean | null;
    databaseName: string | null;
    brainName: string | null;
    reason: string;
  };
  brain: {
    result: "PASS" | "WARN" | "FAIL";
    version: string | null;
    status: string | null;
    reason: string;
  };
  eventLog: {
    result: "PASS" | "FAIL";
    eventCount: number;
    eligibleRows: number;
    rowsExamined: number;
    verifierVersion: string;
    snapshotBoundary: {
      snapshot: string | null;
      xmin: string | null;
      xmax: string | null;
      inProgressTransactions: number;
      capturedAt: string | null;
      allocatorCutoverXid: string | null;
    };
    scanComplete: boolean;
    snapshotCurrentAtVerification: boolean;
    replicaLockWaitMs: number;
    eventLogLockWaitMs: number;
    eventLogLockHoldMs: number;
    scanDurationMs: number;
    verificationDurationMs: number;
    proofDeadlineMs: number;
    gaps: EventLogSequenceFinding[];
    findingsComplete: boolean;
    boundaryTransactionRows: number;
    frozenXidRows: number;
    invalidCausationCount: number;
    invalidCausationIds: string[];
    appendOnlyTrigger: boolean;
    allocatorTriggerEnabled: boolean;
    allocatorContractValid: boolean;
    allocatorBoundaryRecorded: boolean;
    allocatorTriggerXid: string | null;
    allocatorFunctionXid: string | null;
    legacyUnsequencedAggregates: number;
    provenLegacyPrefixAggregates: number;
    ambiguousLegacyAggregates: number;
    postCutoverViolations: number;
    reason: string;
  };
  issues: string[];
};

type VerificationOptions = {
  lockEventLog?: boolean;
  beforeCommit?: (client: DatabaseClient, proof: StartupProof) => Promise<void>;
};

type AllocatorContract = {
  enabled: boolean;
  contractValid: boolean;
  triggerXid: string | null;
  functionXid: string | null;
  cutoverXid: string | null;
  boundaryRecorded: boolean;
};

let latestProof: StartupProof | null = null;

function managedInstanceId(): string | null {
  const value = process.env.LEE_INSTANCE_ID;
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function connectWithinDeadline(timeoutMs: number) {
  const attempt = pool.connect();
  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      attempt,
      new Promise<never>((_resolve, reject) => {
        connectionTimer = setTimeout(
          () => reject(new Error(`Database connection acquisition exceeded ${timeoutMs} ms.`)),
          timeoutMs,
        );
        connectionTimer.unref();
      }),
    ]);
  } catch (error) {
    void attempt.then((lateClient) => lateClient.release(true)).catch(() => undefined);
    throw error;
  } finally {
    if (connectionTimer) clearTimeout(connectionTimer);
  }
}

function appendOnlyContractValid(enabled: string, triggerType: number, source: string) {
  return (enabled === "O" || enabled === "A")
    && triggerType === 27
    && source.toLowerCase().includes("event_log is append-only")
    && source.toLowerCase().includes("raise exception");
}

function allocatorContract(row: {
  enabled?: string;
  trigger_type?: number;
  trigger_xid?: string;
  function_xid?: string;
  trigger_definition?: string;
  function_source?: string;
  boundary_row_count?: number;
  boundary_xid?: string | null;
  trigger_xid_frozen?: boolean;
  function_xid_frozen?: boolean;
} | undefined): AllocatorContract {
  if (!row) {
    return { enabled: false, contractValid: false, triggerXid: null, functionXid: null, cutoverXid: null, boundaryRecorded: false };
  }

  const enabled = row.enabled === "O" || row.enabled === "A";
  const source = String(row.function_source ?? "").toLowerCase().replace(/\s+/g, " ");
  const definition = String(row.trigger_definition ?? "").toLowerCase().replace(/\s+/g, " ");
  const requiredSource = [
    "pg_advisory_xact_lock",
    "hashtextextended",
    "max(sequence_number)",
    "where aggregate_type = new.aggregate_type",
    "and aggregate_id = new.aggregate_id",
    "new.sequence_number := next_sequence",
    "return new",
  ];
  const requiredDefinition = [
    "before insert on public.event_log",
    "for each row",
    "execute function assign_event_log_sequence()",
  ];
  const triggerXid = row.trigger_xid ?? null;
  const functionXid = row.function_xid ?? null;
  const catalogCutoverXid = catalogAllocatorCutoverXid(triggerXid, functionXid);
  const cutoverXid = row.boundary_xid ?? null;
  let boundaryRecorded = false;
  try {
    boundaryRecorded = Boolean(
      row.boundary_row_count === 1
      && cutoverXid
      && BigInt(cutoverXid) > 2n
      && triggerXid
      && functionXid
      && catalogCutoverXid
      && BigInt(cutoverXid) <= BigInt(catalogCutoverXid)
      && !row.trigger_xid_frozen
      && !row.function_xid_frozen,
    );
  } catch {
    boundaryRecorded = false;
  }

  return {
    enabled,
    contractValid: enabled
      && row.trigger_type === 7
      && requiredSource.every((part) => source.includes(part))
      && requiredDefinition.every((part) => definition.includes(part))
      && boundaryRecorded,
    triggerXid,
    functionXid,
    cutoverXid,
    boundaryRecorded,
  };
}

function initialProof(): StartupProof {
  return {
    overall: "FAIL",
    checkedAt: new Date().toISOString(),
    databaseIdentity: {
      result: "FAIL",
      instanceConfigured: managedInstanceId() !== null,
      identityRowCount: 0,
      identityMatches: null,
      databaseName: null,
      brainName: null,
      reason: "The canonical database identity could not be read.",
    },
    brain: {
      result: "WARN",
      version: null,
      status: null,
      reason: "The canonical Brain has no saved version snapshot yet.",
    },
    eventLog: {
      result: "FAIL",
      eventCount: 0,
      eligibleRows: 0,
      rowsExamined: 0,
      verifierVersion: EVENT_LOG_VERIFIER_VERSION,
      snapshotBoundary: {
        snapshot: null,
        xmin: null,
        xmax: null,
        inProgressTransactions: 0,
        capturedAt: null,
        allocatorCutoverXid: null,
      },
      scanComplete: false,
      snapshotCurrentAtVerification: false,
      replicaLockWaitMs: 0,
      eventLogLockWaitMs: 0,
      eventLogLockHoldMs: 0,
      scanDurationMs: 0,
      verificationDurationMs: 0,
      proofDeadlineMs: PROOF_DEADLINE_MS,
      gaps: [],
      findingsComplete: false,
      boundaryTransactionRows: 0,
      frozenXidRows: 0,
      invalidCausationCount: 0,
      invalidCausationIds: [],
      appendOnlyTrigger: false,
      allocatorTriggerEnabled: false,
      allocatorContractValid: false,
      allocatorBoundaryRecorded: false,
      allocatorTriggerXid: null,
      allocatorFunctionXid: null,
      legacyUnsequencedAggregates: 0,
      provenLegacyPrefixAggregates: 0,
      ambiguousLegacyAggregates: 0,
      postCutoverViolations: 0,
      reason: "The complete Event Log proof did not finish.",
    },
    issues: [],
  };
}

export function getStartupProof(): StartupProof | null {
  return latestProof;
}

export async function verifyCanonicalBrainStartup(options: VerificationOptions = {}): Promise<StartupProof> {
  const proof = initialProof();
  const issues: string[] = [];
  const proofStartedAt = Date.now();
  const connectionAttempt = connectWithinDeadline(PROOF_DEADLINE_MS);
  let client: Awaited<typeof connectionAttempt>;
  try {
    client = await connectionAttempt;
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "The database connection could not be acquired.";
    proof.eventLog.reason = `The complete Event Log proof did not start: ${reason}`;
    proof.eventLog.verificationDurationMs = Date.now() - proofStartedAt;
    proof.issues = [proof.eventLog.reason];
    proof.overall = "FAIL";
    proof.checkedAt = new Date().toISOString();
    latestProof = proof;
    return proof;
  }
  let transactionOpen = false;
  let cursorOpen = false;
  let scanStartedAt: number | null = null;
  let eventLogLockAcquiredAt: number | null = null;
  let advisoryLockHeld = false;
  let clientReleased = false;
  let freshnessClient: typeof client | null = null;
  let freshnessClientReleased = false;
  let freshnessTransactionOpen = false;
  let deadlineExceeded = false;
  const remainingDeadlineMs = Math.max(1, PROOF_DEADLINE_MS - (Date.now() - proofStartedAt));
  const deadlineTimer = setTimeout(() => {
    deadlineExceeded = true;
    if (freshnessClient && !freshnessClientReleased) {
      freshnessClientReleased = true;
      freshnessClient.release(true);
    }
    clientReleased = true;
    client.release(true);
  }, remainingDeadlineMs);
  deadlineTimer.unref();

  try {
    await client.query(`SET statement_timeout = '${PROOF_DEADLINE_MS}ms'`);
    await client.query(`SET lock_timeout = '${PROOF_DEADLINE_MS}ms'`);
    const lockStartedAt = Date.now();
    try {
      await client.query(`
        SELECT pg_advisory_lock(
          hashtextextended('lee-startup-integrity:' || current_database(), 0)
        )
      `);
      advisoryLockHeld = true;
    } finally {
      proof.eventLog.replicaLockWaitMs = Date.now() - lockStartedAt;
    }
    await client.query("RESET statement_timeout");
    await client.query("RESET lock_timeout");

    const begin = options.lockEventLog
      ? "BEGIN ISOLATION LEVEL REPEATABLE READ"
      : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY";
    await client.query(begin);
    transactionOpen = true;
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
    await client.query(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT_MS}ms'`);

    if (options.lockEventLog) {
      const lockStartedAt = Date.now();
      try {
        await client.query("LOCK TABLE public.event_log IN SHARE MODE");
        eventLogLockAcquiredAt = Date.now();
      } finally {
        proof.eventLog.eventLogLockWaitMs = Date.now() - lockStartedAt;
      }
    }

    const snapshotResult = await client.query<{
      snapshot: string;
      xmin: string;
      xmax: string;
      active_count: number;
    }>(`
      SELECT
        pg_current_snapshot()::text AS snapshot,
        pg_snapshot_xmin(pg_current_snapshot())::text AS xmin,
        pg_snapshot_xmax(pg_current_snapshot())::text AS xmax,
        (SELECT count(*)::int FROM pg_snapshot_xip(pg_current_snapshot())) AS active_count
    `);
    const snapshot = snapshotResult.rows[0];
    proof.eventLog.snapshotBoundary = {
      snapshot: snapshot?.snapshot ?? null,
      xmin: snapshot?.xmin ?? null,
      xmax: snapshot?.xmax ?? null,
      inProgressTransactions: snapshot?.active_count ?? 0,
      capturedAt: new Date().toISOString(),
      allocatorCutoverXid: null,
    };

    try {
      const database = await client.query<{ current_database: string }>("SELECT current_database()");
      const identityRows = await client.query<{
        instance_id: string;
        database_name: string;
        brain_name: string;
      }>("SELECT instance_id, database_name, brain_name FROM lee_runtime_identity WHERE identity_key = true");
      const identity = identityRows.rows[0];
      const expectedId = managedInstanceId();
      const expectedDatabase = process.env.LEE_DATABASE_NAME ?? "lee";
      proof.databaseIdentity.identityRowCount = identityRows.rows.length;
      proof.databaseIdentity.databaseName = identity?.database_name ?? database.rows[0]?.current_database ?? null;
      proof.databaseIdentity.brainName = identity?.brain_name ?? null;

      if (!expectedId && process.env.NODE_ENV !== "production") {
        proof.databaseIdentity = {
          ...proof.databaseIdentity,
          result: "WARN",
          instanceConfigured: false,
          identityMatches: null,
          reason: "Development API is not attached to a packaged installation identity.",
        };
      } else if (!expectedId) {
        proof.databaseIdentity = {
          ...proof.databaseIdentity,
          result: "FAIL",
          instanceConfigured: false,
          identityMatches: false,
          reason: "Production startup did not provide the existing installation identity.",
        };
        issues.push(proof.databaseIdentity.reason);
      } else if (identityRows.rows.length !== 1 || !identity) {
        proof.databaseIdentity = {
          ...proof.databaseIdentity,
          result: "FAIL",
          instanceConfigured: true,
          identityMatches: false,
          reason: "The database must contain exactly one canonical installation identity.",
        };
        issues.push(proof.databaseIdentity.reason);
      } else {
        const matches = identity.instance_id === expectedId
          && identity.database_name === expectedDatabase
          && identity.brain_name === "canonical";
        proof.databaseIdentity = {
          ...proof.databaseIdentity,
          result: matches ? "PASS" : "FAIL",
          instanceConfigured: true,
          identityMatches: matches,
          reason: matches
            ? "The existing canonical Brain matches this installation."
            : "The existing database identity does not match this installation; no replacement was attempted.",
        };
        if (!matches) issues.push(proof.databaseIdentity.reason);
      }
    } catch {
      proof.databaseIdentity = {
        ...proof.databaseIdentity,
        result: process.env.NODE_ENV === "production" ? "FAIL" : "WARN",
        reason: "The canonical database identity could not be read.",
      };
      if (proof.databaseIdentity.result === "FAIL") issues.push(proof.databaseIdentity.reason);
    }

    try {
      const brainResult = await client.query<{
        version_name: string;
        status: string;
        checksum: string;
      }>("SELECT version_name, status, checksum FROM brain_version ORDER BY created_at DESC LIMIT 1");
      const row = brainResult.rows[0];
      if (row) {
        const valid = row.status === "verified" && /^[0-9a-f]{32,128}$/i.test(row.checksum);
        proof.brain = {
          result: valid ? "PASS" : "FAIL",
          version: row.version_name,
          status: row.status,
          reason: valid ? "The latest Brain version is verified." : "The latest Brain version is not verified.",
        };
        if (!valid) issues.push(proof.brain.reason);
      }
    } catch {
      proof.brain = {
        result: "FAIL",
        version: null,
        status: null,
        reason: "The canonical Brain version could not be read.",
      };
      issues.push(proof.brain.reason);
    }

    if (!snapshot?.xmax || !/^\d+$/.test(snapshot.xmax)) {
      throw new Error("The snapshot boundary is invalid; full transaction IDs cannot be expanded safely.");
    }
    const snapshotXmaxNumeric = BigInt(snapshot.xmax).toString();
    // xmin is 32-bit; normalize negative remainders against this snapshot's full xmax.
    const expandedXidSql = (rawXid: string) => (
      `((${snapshotXmaxNumeric}::numeric - mod(mod(${snapshotXmaxNumeric}::numeric - (${rawXid})::text::numeric, ${TRANSACTION_ID_MODULUS}) + ${TRANSACTION_ID_MODULUS}, ${TRANSACTION_ID_MODULUS}))::text)::xid8`
    );

    const boundaryTableResult = await client.query<{ marker_table: string | null }>(
      "SELECT to_regclass('public.lee_event_log_allocator_state')::text AS marker_table",
    );
    if (!boundaryTableResult.rows[0]?.marker_table) {
      throw new Error("The stable Event Log allocator cutover table is missing; the guarded migration is required before proof.");
    }

    const triggerResult = await client.query<{
      enabled: string;
      trigger_type: number;
      trigger_xid: string;
      function_xid: string;
      trigger_xid_frozen: boolean;
      function_xid_frozen: boolean;
      trigger_definition: string;
      function_source: string;
      boundary_row_count: number;
      boundary_xid: string | null;
      append_enabled: string | null;
      append_type: number | null;
      append_source: string | null;
    }>(`
      SELECT
        allocator.tgenabled AS enabled,
        allocator.tgtype AS trigger_type,
        ${expandedXidSql("allocator.xmin")} AS trigger_xid,
        ${expandedXidSql("allocator_function.xmin")} AS function_xid,
        allocator.xmin = '2'::xid AS trigger_xid_frozen,
        allocator_function.xmin = '2'::xid AS function_xid_frozen,
        pg_get_triggerdef(allocator.oid) AS trigger_definition,
        allocator_function.prosrc AS function_source,
        (SELECT count(*)::int FROM public.lee_event_log_allocator_state) AS boundary_row_count,
        (SELECT cutover_xid::text FROM public.lee_event_log_allocator_state LIMIT 1) AS boundary_xid,
        append_only.tgenabled AS append_enabled,
        append_only.tgtype AS append_type,
        append_function.prosrc AS append_source
      FROM pg_trigger allocator
      JOIN pg_proc allocator_function ON allocator_function.oid = allocator.tgfoid
      LEFT JOIN pg_trigger append_only
        ON append_only.tgrelid = allocator.tgrelid
        AND append_only.tgname = 'event_log_append_only'
        AND NOT append_only.tgisinternal
      LEFT JOIN pg_proc append_function ON append_function.oid = append_only.tgfoid
      WHERE allocator.tgrelid = 'public.event_log'::regclass
        AND allocator.tgname = 'event_log_sequence_allocation'
        AND NOT allocator.tgisinternal
      LIMIT 1
    `);
    const trigger = triggerResult.rows[0];
    const allocator = allocatorContract(trigger);
    const appendOnlyTrigger = Boolean(trigger?.append_enabled && trigger?.append_type !== null
      && trigger?.append_source
      && appendOnlyContractValid(trigger.append_enabled, trigger.append_type, trigger.append_source));
    proof.eventLog.allocatorTriggerEnabled = allocator.enabled;
    proof.eventLog.allocatorContractValid = allocator.contractValid;
    proof.eventLog.allocatorBoundaryRecorded = allocator.boundaryRecorded;
    proof.eventLog.allocatorTriggerXid = allocator.triggerXid;
    proof.eventLog.allocatorFunctionXid = allocator.functionXid;
    proof.eventLog.snapshotBoundary.allocatorCutoverXid = allocator.cutoverXid;
    proof.eventLog.appendOnlyTrigger = appendOnlyTrigger;

    const countResult = await client.query<{
      count: string;
      boundary_count: string;
      frozen_count: string;
    }>(`
      WITH event_rows AS MATERIALIZED (
        SELECT
          xmin,
          ${expandedXidSql("xmin")} AS event_xid
        FROM public.event_log
      )
      SELECT
        count(*)::text AS count,
        count(*) FILTER (WHERE event_xid = $1::xid8)::text AS boundary_count,
        count(*) FILTER (WHERE xmin = '2'::xid)::text AS frozen_count
      FROM event_rows
    `, [allocator.cutoverXid]);
    const eligibleRows = Number(countResult.rows[0]?.count ?? "0");
    if (!Number.isSafeInteger(eligibleRows) || eligibleRows < 0) {
      throw new Error("Event Log row count is not a safe integer.");
    }
    proof.eventLog.eligibleRows = eligibleRows;
    proof.eventLog.eventCount = eligibleRows;
    proof.eventLog.boundaryTransactionRows = Number(countResult.rows[0]?.boundary_count ?? "0");
    proof.eventLog.frozenXidRows = Number(countResult.rows[0]?.frozen_count ?? "0");
    if (!Number.isSafeInteger(proof.eventLog.boundaryTransactionRows) || proof.eventLog.boundaryTransactionRows < 0
      || !Number.isSafeInteger(proof.eventLog.frozenXidRows) || proof.eventLog.frozenXidRows < 0) {
      throw new Error("Event Log transaction-boundary counts could not be represented safely.");
    }

    const cutoverSql = allocator.contractValid && allocator.cutoverXid
      ? `CASE WHEN ${expandedXidSql("xmin")} < '${allocator.cutoverXid}'::xid8 THEN 0 ELSE 1 END`
      : "0";
    scanStartedAt = Date.now();
    await client.query(`
      DECLARE ${CURSOR_NAME} NO SCROLL CURSOR FOR
      SELECT
        id::text AS id,
        aggregate_type,
        aggregate_id,
        sequence_number,
        ${expandedXidSql("xmin")} AS event_xid
      FROM public.event_log
      ORDER BY aggregate_type, aggregate_id, ${cutoverSql}, sequence_number, id
    `);
    cursorOpen = true;

    const analyzer = new EventLogSequenceAnalyzer(allocator.contractValid ? allocator.cutoverXid : null);
    while (true) {
      const batch = await client.query<{
        id: string;
        aggregate_type: string;
        aggregate_id: string;
        sequence_number: number;
        event_xid: string;
      }>(`FETCH FORWARD ${FETCH_SIZE} FROM ${CURSOR_NAME}`);
      for (const row of batch.rows) analyzer.push(row);
      proof.eventLog.rowsExamined += batch.rows.length;
      if (batch.rows.length < FETCH_SIZE) break;
    }
    proof.eventLog.scanDurationMs = scanStartedAt === null ? 0 : Date.now() - scanStartedAt;
    await client.query(`CLOSE ${CURSOR_NAME}`);
    cursorOpen = false;
    const sequenceAnalysis = analyzer.finish();
    proof.eventLog.gaps = sequenceAnalysis.gaps;
    proof.eventLog.legacyUnsequencedAggregates = sequenceAnalysis.legacyUnsequencedAggregates;
    proof.eventLog.provenLegacyPrefixAggregates = sequenceAnalysis.provenLegacyPrefixAggregates;
    proof.eventLog.ambiguousLegacyAggregates = sequenceAnalysis.ambiguousLegacyAggregates;
    proof.eventLog.postCutoverViolations = sequenceAnalysis.postCutoverViolations;
    if (sequenceAnalysis.boundaryRows !== proof.eventLog.boundaryTransactionRows) {
      throw new Error("The transaction-boundary row count disagreed with the sequence scan.");
    }
    proof.eventLog.findingsComplete = sequenceAnalysis.findingsComplete;
    proof.eventLog.scanComplete = proof.eventLog.rowsExamined === eligibleRows;

    const causationResult = await client.query<{
      invalid_count: string;
      sample_ids: string[] | null;
    }>(`
      WITH invalid AS MATERIALIZED (
        SELECT e.id::text AS id
        FROM public.event_log e
        LEFT JOIN public.event_log cause ON cause.id = e.causation_id
        WHERE e.causation_id IS NOT NULL
          AND cause.id IS NULL
      )
      SELECT
        (SELECT count(*)::text FROM invalid) AS invalid_count,
        (SELECT array_agg(sample.id ORDER BY sample.id)
           FROM (SELECT id FROM invalid ORDER BY id LIMIT ${CAUSATION_SAMPLE_LIMIT}) sample) AS sample_ids
    `);
    const invalidCausationCount = Number(causationResult.rows[0]?.invalid_count ?? "0");
    const causationCountValid = Number.isSafeInteger(invalidCausationCount) && invalidCausationCount >= 0;
    proof.eventLog.invalidCausationCount = causationCountValid ? invalidCausationCount : 0;
    proof.eventLog.invalidCausationIds = causationResult.rows[0]?.sample_ids ?? [];

    let freshnessResult: { rows: { invisible_count: string }[] };
    if (snapshot?.snapshot) {
      const freshnessConnectionTimeoutMs = Math.max(1, PROOF_DEADLINE_MS - (Date.now() - proofStartedAt));
      freshnessClient = await connectWithinDeadline(freshnessConnectionTimeoutMs);
      if (deadlineExceeded) {
        freshnessClientReleased = true;
        freshnessClient.release(true);
        throw new Error("The startup proof deadline expired while acquiring a freshness-check connection.");
      }
      await freshnessClient.query("BEGIN READ ONLY");
      freshnessTransactionOpen = true;
      await freshnessClient.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);
      freshnessResult = await freshnessClient.query<{ invisible_count: string }>(`
          WITH current_snapshot AS (
            SELECT
              pg_current_snapshot() AS snapshot,
              pg_snapshot_xmax(pg_current_snapshot())::text::numeric AS xmax
          )
          SELECT count(*) FILTER (
            WHERE NOT pg_visible_in_snapshot(
              CASE
                WHEN event.xmin = '2'::xid THEN '2'::xid8
                ELSE ((current_snapshot.xmax - mod(mod(
                  current_snapshot.xmax - event.xmin::text::numeric,
                  ${TRANSACTION_ID_MODULUS}
                ) + ${TRANSACTION_ID_MODULUS}, ${TRANSACTION_ID_MODULUS}))::text)::xid8
              END,
              $1::pg_snapshot
            )
          )::text AS invisible_count
          FROM public.event_log event
          CROSS JOIN current_snapshot
        `, [snapshot.snapshot]);
      await freshnessClient.query("COMMIT");
      freshnessTransactionOpen = false;
      freshnessClient.release();
      freshnessClientReleased = true;
      freshnessClient = null;
    } else {
      freshnessResult = { rows: [{ invisible_count: "1" }] };
    }
    proof.eventLog.snapshotCurrentAtVerification = Number(freshnessResult.rows[0]?.invisible_count ?? "1") === 0;

    const eventFailures: string[] = [];
    if (!snapshot?.snapshot || !snapshot.xmin || !snapshot.xmax) eventFailures.push("the repeatable-read snapshot boundary could not be captured");
    if (!causationCountValid) eventFailures.push("the invalid-causation count could not be represented safely");
    if (!proof.eventLog.scanComplete) eventFailures.push("the snapshot scan did not examine every eligible row");
    if (!proof.eventLog.snapshotCurrentAtVerification) eventFailures.push("events committed after the snapshot were not included");
    if (!appendOnlyTrigger) eventFailures.push("the enabled append-only trigger contract is missing");
    if (!allocator.enabled || !allocator.contractValid) eventFailures.push("the enabled sequence-allocation trigger contract is missing");
    if (sequenceAnalysis.gaps.length) eventFailures.push(`${sequenceAnalysis.gaps.length} sequence finding(s) remain`);
    if (!allocator.boundaryRecorded) eventFailures.push("the immutable allocator cutover record is missing or inconsistent");
    if (proof.eventLog.boundaryTransactionRows) eventFailures.push(`${proof.eventLog.boundaryTransactionRows} event(s) share the allocator cutover transaction`);
    if (proof.eventLog.frozenXidRows) eventFailures.push(`${proof.eventLog.frozenXidRows} event(s) have a frozen transaction ID`);
    if (!sequenceAnalysis.findingsComplete) eventFailures.push("the exact finding or provenance inventory reached a safety limit");
    if (proof.eventLog.invalidCausationCount) eventFailures.push(`${proof.eventLog.invalidCausationCount} invalid causation reference(s) remain`);
    proof.eventLog.result = eventFailures.length ? "FAIL" : "PASS";
    proof.eventLog.reason = eventFailures.length
      ? `Full Event Log verification failed: ${eventFailures.join("; ")}.`
      : `All ${eligibleRows} Event Log rows were checked in one snapshot; the allocator and append-only contracts are enabled.`;
    if (eventFailures.length) issues.push(proof.eventLog.reason);

    proof.eventLog.verificationDurationMs = Date.now() - proofStartedAt;
    proof.checkedAt = new Date().toISOString();
    proof.issues = [...new Set(issues)];
    proof.overall = proof.issues.length || proof.databaseIdentity.result === "FAIL" || proof.brain.result === "FAIL" || proof.eventLog.result === "FAIL"
      ? "FAIL"
      : "PASS";

    if (options.beforeCommit && proof.overall === "PASS") {
      if (!options.lockEventLog) {
        throw new Error("A transition callback requires the Event Log insert lock.");
      }
      await options.beforeCommit(client, proof);
    }

    await client.query("COMMIT");
    transactionOpen = false;
    clearTimeout(deadlineTimer);
    latestProof = proof;
    return proof;
  } catch (error) {
    if (cursorOpen && !clientReleased) {
      await client.query(`CLOSE ${CURSOR_NAME}`).catch(() => undefined);
      cursorOpen = false;
    }
    if (transactionOpen && !clientReleased) {
      await client.query("ROLLBACK").catch(() => undefined);
      transactionOpen = false;
    }
    const reason = deadlineExceeded
      ? `The startup proof exceeded its ${PROOF_DEADLINE_MS} ms deadline.`
      : error instanceof Error ? error.message.slice(0, 240) : "The Event Log scan was interrupted.";
    proof.eventLog.result = "FAIL";
    proof.eventLog.scanComplete = false;
    proof.eventLog.findingsComplete = false;
    proof.eventLog.snapshotCurrentAtVerification = false;
    if (scanStartedAt !== null) proof.eventLog.scanDurationMs = Date.now() - scanStartedAt;
    proof.eventLog.verificationDurationMs = Date.now() - proofStartedAt;
    proof.eventLog.reason = `The complete Event Log proof did not finish: ${reason}`;
    proof.issues = [...new Set([...issues, proof.eventLog.reason])];
    proof.overall = "FAIL";
    proof.checkedAt = new Date().toISOString();
    latestProof = proof;
    return proof;
  } finally {
    if (freshnessClient && !freshnessClientReleased) {
      if (freshnessTransactionOpen) {
        await freshnessClient.query("ROLLBACK").catch(() => undefined);
        freshnessTransactionOpen = false;
      }
      freshnessClient.release();
      freshnessClientReleased = true;
      freshnessClient = null;
    }
    if (advisoryLockHeld && !clientReleased) {
      const unlocked = await client.query(`
        SELECT pg_advisory_unlock(
          hashtextextended('lee-startup-integrity:' || current_database(), 0)
        )
      `).then(() => true).catch(() => false);
      advisoryLockHeld = false;
      if (!unlocked) {
        clientReleased = true;
        client.release(true);
      }
    }
    if (!clientReleased) {
      await client.query("RESET statement_timeout").catch(() => undefined);
      await client.query("RESET lock_timeout").catch(() => undefined);
      client.release();
    }
    if (eventLogLockAcquiredAt !== null) {
      proof.eventLog.eventLogLockHoldMs = Date.now() - eventLogLockAcquiredAt;
    }
    proof.eventLog.verificationDurationMs = Date.now() - proofStartedAt;
    proof.checkedAt = new Date().toISOString();
    clearTimeout(deadlineTimer);
  }
}