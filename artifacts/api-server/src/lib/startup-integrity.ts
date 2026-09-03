import { pool } from "@workspace/db";

export type StartupProof = {
  overall: "PASS" | "FAIL";
  checkedAt: string;
  databaseIdentity: {
    result: "PASS" | "WARN" | "FAIL";
    instanceId: string | null;
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
    gaps: Array<Record<string, unknown>>;
    legacyUnsequencedAggregates: number;
    invalidCausationIds: string[];
    appendOnlyTrigger: boolean;
    reason: string;
  };
  issues: string[];
};

let latestProof: StartupProof | null = null;

function managedInstanceId(): string | null {
  return process.env.LEE_INSTANCE_ID && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(process.env.LEE_INSTANCE_ID)
    ? process.env.LEE_INSTANCE_ID
    : null;
}

export function getStartupProof(): StartupProof | null {
  return latestProof;
}

export async function verifyCanonicalBrainStartup(): Promise<StartupProof> {
  const expectedInstanceId = managedInstanceId();
  const issues: string[] = [];
  let databaseIdentity: StartupProof["databaseIdentity"] = {
    result: "FAIL",
    instanceId: null,
    databaseName: null,
    brainName: null,
    reason: "The canonical database identity could not be read.",
  };

  try {
    const database = await pool.query<{ current_database: string }>("SELECT current_database()");
    const row = await pool.query<{ instance_id: string; database_name: string; brain_name: string }>(
      "SELECT instance_id, database_name, brain_name FROM lee_runtime_identity WHERE identity_key = true LIMIT 1",
    );
    const identity = row.rows[0];
    if (!expectedInstanceId && process.env.NODE_ENV !== "production") {
      databaseIdentity = {
        result: "WARN",
        instanceId: identity?.instance_id ?? null,
        databaseName: database.rows[0]?.current_database ?? null,
        brainName: identity?.brain_name ?? null,
        reason: "Development API is not attached to a packaged installation identity.",
      };
    } else if (!expectedInstanceId) {
      databaseIdentity = { ...databaseIdentity, reason: "Packaged startup did not provide a canonical installation identity." };
      issues.push(databaseIdentity.reason);
    } else if (!identity) {
      databaseIdentity = { ...databaseIdentity, reason: "The database has no canonical installation identity." };
      issues.push(databaseIdentity.reason);
    } else if (
      identity.instance_id !== expectedInstanceId
      || identity.database_name !== (process.env.LEE_DATABASE_NAME ?? "lee")
      || identity.brain_name !== "canonical"
    ) {
      databaseIdentity = {
        result: "FAIL",
        instanceId: identity.instance_id,
        databaseName: identity.database_name,
        brainName: identity.brain_name,
        reason: "The database identity does not match this installation; a replacement Brain was refused.",
      };
      issues.push(databaseIdentity.reason);
    } else {
      databaseIdentity = {
        result: "PASS",
        instanceId: identity.instance_id,
        databaseName: identity.database_name,
        brainName: identity.brain_name,
        reason: "The database is the canonical Brain assigned to this installation.",
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The canonical database identity could not be read.";
    if (!expectedInstanceId && process.env.NODE_ENV !== "production") {
      databaseIdentity = {
        result: "WARN",
        instanceId: null,
        databaseName: null,
        brainName: null,
        reason: `Development API is not attached to a packaged installation identity (${reason.slice(0, 180)}).`,
      };
    } else {
      databaseIdentity = { ...databaseIdentity, reason: reason.slice(0, 240) };
      issues.push(databaseIdentity.reason);
    }
  }

  let brain: StartupProof["brain"] = {
    result: "WARN",
    version: null,
    status: null,
    reason: "The canonical Brain has no saved version snapshot yet; the empty Brain is still the installation's canonical store.",
  };
  try {
    const result = await pool.query<{ version_name: string; status: string; checksum: string }>(
      "SELECT version_name, status, checksum FROM brain_version ORDER BY created_at DESC LIMIT 1",
    );
    const row = result.rows[0];
    if (row) {
      const valid = row.status === "verified" && /^[0-9a-f]{32,128}$/i.test(row.checksum);
      brain = {
        result: valid ? "PASS" : "FAIL",
        version: row.version_name,
        status: row.status,
        reason: valid ? "The latest Brain version is verified." : "The latest Brain version is not verified.",
      };
      if (!valid) issues.push(brain.reason);
    }
  } catch (error) {
    brain = { result: "FAIL", version: null, status: null, reason: error instanceof Error ? error.message.slice(0, 240) : "The Brain version could not be read." };
    issues.push(brain.reason);
  }

  let eventLog: StartupProof["eventLog"] = {
    result: "FAIL",
    eventCount: 0,
    gaps: [],
    legacyUnsequencedAggregates: 0,
    invalidCausationIds: [],
    appendOnlyTrigger: false,
    reason: "The Event Log continuity proof could not be read.",
  };
  try {
    const events = await pool.query<{ id: string; aggregate_type: string; aggregate_id: string; sequence_number: number; causation_id: string | null }>(
      "SELECT id, aggregate_type, aggregate_id, sequence_number, causation_id FROM event_log ORDER BY created_at ASC, id ASC LIMIT 100001",
    );
    const ids = new Set(events.rows.map((event) => event.id));
    const latestByAggregate = new Map<string, number>();
    const sequencedAggregates = new Set<string>();
    const legacyAggregates = new Set<string>();
    const gaps: Array<Record<string, unknown>> = [];
    for (const event of events.rows) {
      const aggregate = `${event.aggregate_type}:${event.aggregate_id}`;
      const previous = latestByAggregate.get(aggregate);
      if (event.sequence_number === 1 && !sequencedAggregates.has(aggregate)) {
        legacyAggregates.add(aggregate);
      } else if (previous === undefined && event.sequence_number !== 1) {
        gaps.push({ aggregateType: event.aggregate_type, aggregateId: event.aggregate_id, expected: 1, actual: event.sequence_number });
      } else if (!sequencedAggregates.has(aggregate) && event.sequence_number !== 2) {
        gaps.push({ aggregateType: event.aggregate_type, aggregateId: event.aggregate_id, expected: 2, actual: event.sequence_number });
      } else if (previous !== undefined && event.sequence_number !== previous + 1) {
        gaps.push({ aggregateType: event.aggregate_type, aggregateId: event.aggregate_id, expected: previous + 1, actual: event.sequence_number });
      }
      if (event.sequence_number > 1) sequencedAggregates.add(aggregate);
      latestByAggregate.set(aggregate, event.sequence_number);
    }
    const legacyUnsequencedAggregates = legacyAggregates.size;
    const invalidCausationIds = events.rows.filter((event) => event.causation_id && !ids.has(event.causation_id)).map((event) => event.id);
    const trigger = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM pg_trigger WHERE tgname = 'event_log_append_only' AND NOT tgisinternal",
    );
    const appendOnlyTrigger = Number(trigger.rows[0]?.count ?? 0) > 0;
    const boundedScanExceeded = events.rows.length > 100000;
    const failed = gaps.length > 0 || invalidCausationIds.length > 0 || !appendOnlyTrigger || boundedScanExceeded;
    eventLog = {
      result: failed ? "FAIL" : "PASS",
      eventCount: events.rows.length,
      gaps,
      legacyUnsequencedAggregates,
      invalidCausationIds,
      appendOnlyTrigger,
      reason: failed
        ? (boundedScanExceeded
          ? "The Event Log exceeded the bounded startup proof scan."
          : `The Event Log has a continuity or append-only enforcement problem (${gaps.length} sequence gap(s), ${invalidCausationIds.length} invalid causation reference(s), append-only trigger ${appendOnlyTrigger ? "present" : "missing"}).`)
        : legacyUnsequencedAggregates
          ? `Event sequences, causation references, and append-only enforcement are intact; ${legacyUnsequencedAggregates} legacy aggregate(s) retain their historical default sequence.`
          : "Event sequences, causation references, and append-only enforcement are intact.",
    };
    if (failed) issues.push(eventLog.reason);
  } catch (error) {
    eventLog = { ...eventLog, reason: error instanceof Error ? error.message.slice(0, 240) : eventLog.reason };
    issues.push(eventLog.reason);
  }

  latestProof = {
    overall: issues.length || databaseIdentity.result === "FAIL" || brain.result === "FAIL" || eventLog.result === "FAIL" ? "FAIL" : "PASS",
    checkedAt: new Date().toISOString(),
    databaseIdentity,
    brain,
    eventLog,
    issues: [...new Set(issues)],
  };
  return latestProof;
}