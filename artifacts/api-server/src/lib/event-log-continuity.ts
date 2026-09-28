export const EVENT_LOG_VERIFIER_VERSION = "event-log-continuity-v5";

const MAX_FINDINGS = 5_000;
const MAX_EVENT_IDS = 25_000;
const MAX_IDS_PER_FINDING = 500;
const MAX_IDS_PER_STREAM = 500;
const XID_MODULUS = 1n << 32n;

export type EventLogSequenceRow = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  sequence_number: number;
  event_xid: string;
};

export type EventLogSequenceFinding = {
  kind:
    | "duplicate_sequence"
    | "missing_sequence_range"
    | "invalid_sequence"
    | "legacy_transition_unproven"
    | "allocator_sequence_violation";
  aggregateType: string;
  aggregateId: string;
  sequenceNumber?: number;
  expected?: number;
  actual?: number;
  missingThrough?: number;
  eventIds: string[];
  eventCount: number;
  eventIdsComplete: boolean;
};

export type EventLogSequenceAnalysis = {
  aggregatesScanned: number;
  gaps: EventLogSequenceFinding[];
  legacyUnsequencedAggregates: number;
  provenLegacyPrefixAggregates: number;
  ambiguousLegacyAggregates: number;
  postCutoverViolations: number;
  boundaryRows: number;
  findingsComplete: boolean;
  eventIdsCaptured: number;
};

type Era = "pre" | "post";

type StreamState = {
  aggregateType: string;
  aggregateId: string;
  era: Era;
  preRows: number;
  postRows: number;
  preHasSequenceOne: boolean;
  preHasNumbered: boolean;
  postHasSequenceOne: boolean;
  postHasNumbered: boolean;
  preMaxSequence: number;
  nextPreSequence: number | null;
  nextPostSequence: number | null;
  preLastSequence: number | null;
  postLastSequence: number | null;
  preLastSequenceIds: string[];
  postLastSequenceIds: string[];
  preDuplicateFinding: EventLogSequenceFinding | null;
  postDuplicateFinding: EventLogSequenceFinding | null;
  preEventIds: string[];
  preEventIdsComplete: boolean;
};

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function expandTransactionId(rawXid: string, snapshotXmax: string): string {
  const raw = BigInt(rawXid);
  const xmax = BigInt(snapshotXmax);
  if (raw < 0n || raw >= XID_MODULUS || xmax < 0n) {
    throw new Error("Event Log transaction ID is outside the PostgreSQL xid range.");
  }

  let expanded = (xmax / XID_MODULUS) * XID_MODULUS + raw;
  if (expanded >= xmax) expanded -= XID_MODULUS;
  if (expanded < 0n) throw new Error("Event Log transaction ID could not be expanded against the snapshot.");
  return expanded.toString();
}

function rowEra(row: EventLogSequenceRow, cutoverXid: string | null): Era {
  if (!cutoverXid) return "pre";
  return BigInt(row.event_xid) >= BigInt(cutoverXid) ? "post" : "pre";
}

export function catalogAllocatorCutoverXid(triggerXid: string | null, functionXid: string | null): string | null {
  if (!triggerXid || !functionXid) return null;
  try {
    const triggerVersion = BigInt(triggerXid);
    const functionVersion = BigInt(functionXid);
    if (triggerVersion <= 2n || functionVersion <= 2n) return null;
    return (triggerVersion > functionVersion ? triggerVersion : functionVersion).toString();
  } catch {
    return null;
  }
}

export class EventLogSequenceAnalyzer {
  private current: StreamState | null = null;
  private findings: EventLogSequenceFinding[] = [];
  private aggregatesScanned = 0;
  private legacyUnsequencedAggregates = 0;
  private provenLegacyPrefixAggregates = 0;
  private ambiguousLegacyAggregates = 0;
  private postCutoverViolations = 0;
  private boundaryRows = 0;
  private findingsComplete = true;
  private eventIdsCaptured = 0;
  private finished = false;

  constructor(private readonly cutoverXid: string | null) {}

  push(row: EventLogSequenceRow) {
    if (this.finished) throw new Error("Cannot add Event Log rows after analysis is complete.");

    if (this.cutoverXid && BigInt(row.event_xid) === BigInt(this.cutoverXid)) {
      this.boundaryRows += 1;
    }
    const era = rowEra(row, this.cutoverXid);
    if (
      !this.current
      || this.current.aggregateType !== row.aggregate_type
      || this.current.aggregateId !== row.aggregate_id
    ) {
      this.finishCurrentStream();
      this.current = {
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        era,
        preRows: 0,
        postRows: 0,
        preHasSequenceOne: false,
        preHasNumbered: false,
        postHasSequenceOne: false,
        postHasNumbered: false,
        preMaxSequence: 0,
        nextPreSequence: null,
        nextPostSequence: null,
        preLastSequence: null,
        postLastSequence: null,
        preLastSequenceIds: [],
        postLastSequenceIds: [],
        preDuplicateFinding: null,
        postDuplicateFinding: null,
        preEventIds: [],
        preEventIdsComplete: true,
      };
      this.aggregatesScanned += 1;
    } else if (this.current.era === "pre" && era === "post") {
      this.current.era = "post";
      this.current.nextPostSequence = this.current.preRows > 0
        ? this.current.preMaxSequence + 1
        : 1;
    } else if (this.current.era !== era) {
      throw new Error("Event Log cursor rows were not ordered by allocator era.");
    }

    if (era === "pre") this.processPreCutover(row);
    else this.processPostCutover(row);
  }

  finish(): EventLogSequenceAnalysis {
    if (this.finished) throw new Error("Event Log sequence analysis was already finalized.");
    this.finishCurrentStream();
    this.finished = true;
    return {
      aggregatesScanned: this.aggregatesScanned,
      gaps: this.findings,
      legacyUnsequencedAggregates: this.legacyUnsequencedAggregates,
      provenLegacyPrefixAggregates: this.provenLegacyPrefixAggregates,
      ambiguousLegacyAggregates: this.ambiguousLegacyAggregates,
      postCutoverViolations: this.postCutoverViolations,
      boundaryRows: this.boundaryRows,
      findingsComplete: this.findingsComplete,
      eventIdsCaptured: this.eventIdsCaptured,
    };
  }

  private processPreCutover(row: EventLogSequenceRow) {
    const state = this.current!;
    state.preRows += 1;
    if (state.preEventIds.length < MAX_IDS_PER_STREAM) state.preEventIds.push(row.id);
    else state.preEventIdsComplete = false;

    if (row.sequence_number <= 0) {
      this.addFinding({
        kind: "invalid_sequence",
        aggregateType: state.aggregateType,
        aggregateId: state.aggregateId,
        actual: row.sequence_number,
        eventIds: [row.id],
        eventCount: 1,
      });
      state.preLastSequence = row.sequence_number;
      state.preLastSequenceIds = [row.id];
      return;
    }

    state.preMaxSequence = Math.max(state.preMaxSequence, row.sequence_number);
    if (row.sequence_number === 1) {
      state.preHasSequenceOne = true;
      if (state.preLastSequence === 1) {
        state.preLastSequenceIds.push(row.id);
      } else {
        state.preLastSequence = 1;
        state.preLastSequenceIds = [row.id];
        state.preDuplicateFinding = null;
      }
      state.nextPreSequence = 2;
      return;
    }

    state.preHasNumbered = true;
    const expected = state.nextPreSequence ?? 1;
    if (row.sequence_number === state.preLastSequence && row.sequence_number > 1) {
      this.appendDuplicateId(
        state.preDuplicateFinding,
        row.id,
        state.preLastSequenceIds,
        (finding) => { state.preDuplicateFinding = finding; },
        state.aggregateType,
        state.aggregateId,
        row.sequence_number,
      );
    } else if (row.sequence_number > expected) {
      this.addFinding({
        kind: "missing_sequence_range",
        aggregateType: state.aggregateType,
        aggregateId: state.aggregateId,
        expected,
        actual: row.sequence_number,
        missingThrough: row.sequence_number - 1,
        eventIds: state.preLastSequenceIds.length ? [state.preLastSequenceIds.at(-1)!, row.id] : [row.id],
        eventCount: state.preLastSequenceIds.length ? 2 : 1,
      });
    } else if (row.sequence_number < expected) {
      this.addFinding({
        kind: "invalid_sequence",
        aggregateType: state.aggregateType,
        aggregateId: state.aggregateId,
        expected,
        actual: row.sequence_number,
        eventIds: [row.id],
        eventCount: 1,
      });
    }

    if (row.sequence_number !== state.preLastSequence) {
      state.preLastSequence = row.sequence_number;
      state.preLastSequenceIds = [row.id];
      state.preDuplicateFinding = null;
    } else {
      state.preLastSequenceIds.push(row.id);
    }
    state.nextPreSequence = row.sequence_number >= expected
      ? row.sequence_number + 1
      : expected;
  }

  private processPostCutover(row: EventLogSequenceRow) {
    const state = this.current!;
    state.postRows += 1;
    const expected = state.nextPostSequence ?? (state.preRows > 0 ? state.preMaxSequence + 1 : 1);

    if (row.sequence_number <= 0) {
      this.postCutoverViolations += 1;
      this.addFinding({
        kind: "allocator_sequence_violation",
        aggregateType: state.aggregateType,
        aggregateId: state.aggregateId,
        expected,
        actual: row.sequence_number,
        eventIds: [row.id],
        eventCount: 1,
      });
      state.postLastSequence = row.sequence_number;
      state.postLastSequenceIds = [row.id];
      return;
    }

    if (row.sequence_number === 1) state.postHasSequenceOne = true;
    else state.postHasNumbered = true;

    if (row.sequence_number === state.postLastSequence) {
      this.postCutoverViolations += 1;
      this.appendDuplicateId(
        state.postDuplicateFinding,
        row.id,
        state.postLastSequenceIds,
        (finding) => { state.postDuplicateFinding = finding; },
        state.aggregateType,
        state.aggregateId,
        row.sequence_number,
        true,
      );
      return;
    }

    if (row.sequence_number !== expected) {
      this.postCutoverViolations += 1;
      this.addFinding({
        kind: "allocator_sequence_violation",
        aggregateType: state.aggregateType,
        aggregateId: state.aggregateId,
        expected,
        actual: row.sequence_number,
        missingThrough: row.sequence_number > expected ? row.sequence_number - 1 : undefined,
        eventIds: state.postLastSequenceIds.length ? [state.postLastSequenceIds.at(-1)!, row.id] : [row.id],
        eventCount: state.postLastSequenceIds.length ? 2 : 1,
      });
    }

    state.postLastSequence = row.sequence_number;
    state.postLastSequenceIds = [row.id];
    state.postDuplicateFinding = null;
    state.nextPostSequence = row.sequence_number >= expected
      ? row.sequence_number + 1
      : expected;
  }

  private finishCurrentStream() {
    const state = this.current;
    if (!state) return;

    if (state.preHasSequenceOne && !state.preHasNumbered) {
      this.legacyUnsequencedAggregates += 1;
      if (state.postHasNumbered) this.provenLegacyPrefixAggregates += 1;
    } else if (state.preHasSequenceOne && state.preHasNumbered) {
      this.ambiguousLegacyAggregates += 1;
      if (!state.preEventIdsComplete) this.findingsComplete = false;
      this.addFinding({
        kind: "legacy_transition_unproven",
        aggregateType: state.aggregateType,
        aggregateId: state.aggregateId,
        expected: 2,
        actual: 1,
        eventIds: state.preEventIds,
        eventCount: state.preRows,
        eventIdsComplete: state.preEventIdsComplete,
      });
    }
    this.current = null;
  }

  private appendDuplicateId(
    currentFinding: EventLogSequenceFinding | null,
    eventId: string,
    priorIds: string[],
    setFinding: (finding: EventLogSequenceFinding) => void,
    aggregateType: string,
    aggregateId: string,
    sequenceNumber: number,
    postCutover = false,
  ) {
    if (currentFinding) {
      this.appendIds(currentFinding, [eventId]);
      currentFinding.eventCount += 1;
      currentFinding.eventIdsComplete = currentFinding.eventIdsComplete && currentFinding.eventIds.length === currentFinding.eventCount;
      return;
    }
    const finding = this.addFinding({
      kind: postCutover ? "allocator_sequence_violation" : "duplicate_sequence",
      aggregateType,
      aggregateId,
      sequenceNumber,
      expected: sequenceNumber,
      actual: sequenceNumber,
      eventIds: [...priorIds, eventId],
      eventCount: priorIds.length + 1,
    });
    if (finding) setFinding(finding);
  }

  private addFinding(
    input: Omit<EventLogSequenceFinding, "eventIdsComplete"> & { eventIdsComplete?: boolean },
  ): EventLogSequenceFinding | null {
    if (this.findings.length >= MAX_FINDINGS) {
      this.findingsComplete = false;
      return null;
    }
    const finding: EventLogSequenceFinding = {
      ...input,
      eventIds: [],
      eventIdsComplete: input.eventIdsComplete ?? true,
    };
    this.appendIds(finding, input.eventIds);
    finding.eventIdsComplete = finding.eventIdsComplete && finding.eventIds.length === input.eventCount;
    this.findings.push(finding);
    return finding;
  }

  private appendIds(finding: EventLogSequenceFinding | null, ids: string[]) {
    if (!finding) return;
    const remainingGlobal = Math.max(0, MAX_EVENT_IDS - this.eventIdsCaptured);
    const remainingFinding = Math.max(0, MAX_IDS_PER_FINDING - finding.eventIds.length);
    const accepted = ids.slice(0, Math.min(remainingGlobal, remainingFinding));
    finding.eventIds.push(...accepted);
    this.eventIdsCaptured += accepted.length;
    if (accepted.length < ids.length) {
      finding.eventIdsComplete = false;
      this.findingsComplete = false;
    }
  }
}

export function analyzeEventLogSequences(
  rows: readonly EventLogSequenceRow[],
  cutoverXid: string | null,
): EventLogSequenceAnalysis {
  const sorted = [...rows].sort((a, b) => (
    compareText(a.aggregate_type, b.aggregate_type)
    || compareText(a.aggregate_id, b.aggregate_id)
    || (rowEra(a, cutoverXid) === rowEra(b, cutoverXid) ? 0 : rowEra(a, cutoverXid) === "pre" ? -1 : 1)
    || a.sequence_number - b.sequence_number
    || compareText(a.id, b.id)
  ));
  const analyzer = new EventLogSequenceAnalyzer(cutoverXid);
  for (const row of sorted) analyzer.push(row);
  return analyzer.finish();
}