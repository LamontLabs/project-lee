function quoteIdentifier(value) {
  if (typeof value !== "string" || !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(value)) {
    throw new Error("Event Log allocator SQL requires a simple PostgreSQL identifier.");
  }
  return `"${value}"`;
}

export function eventLogAllocatorBoundarySql({ schema = "public", table = "event_log", trigger = "event_log_sequence_allocation" } = {}) {
  const qualifiedTable = `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
  const qualifiedStateTable = `${quoteIdentifier(schema)}."lee_event_log_allocator_state"`;
  const triggerName = trigger.replaceAll("'", "''");
  const tableRegclass = qualifiedTable.replaceAll("'", "''");

  return `
    CREATE TABLE IF NOT EXISTS ${qualifiedStateTable} (
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
      cutover_xid xid8 NOT NULL CHECK (cutover_xid > '2'::xid8),
      recorded_at timestamptz NOT NULL DEFAULT now()
    );

    WITH snapshot AS (
      SELECT pg_snapshot_xmax(pg_current_snapshot())::text::numeric AS xmax
    ),
    allocator_catalog AS (
      SELECT
        allocator.xmin::text::numeric AS trigger_xid,
        allocator_function.xmin::text::numeric AS function_xid,
        allocator.xmin = '2'::xid AS trigger_frozen,
        allocator_function.xmin = '2'::xid AS function_frozen,
        snapshot.xmax
      FROM pg_trigger allocator
      JOIN pg_proc allocator_function ON allocator_function.oid = allocator.tgfoid
      CROSS JOIN snapshot
      WHERE allocator.tgrelid = '${tableRegclass}'::regclass
        AND allocator.tgname = '${triggerName}'
        AND NOT allocator.tgisinternal
      LIMIT 1
    )
    INSERT INTO ${qualifiedStateTable} (singleton, cutover_xid)
    SELECT true,
      -- xid is 32-bit: normalize the remainder before subtracting to select the
      -- nearest prior full-XID epoch, including when xmax - xmin is negative.
      GREATEST(
        (xmax - mod(mod(xmax - trigger_xid, 4294967296) + 4294967296, 4294967296))::text::xid8,
        (xmax - mod(mod(xmax - function_xid, 4294967296) + 4294967296, 4294967296))::text::xid8
      )
    FROM allocator_catalog
    WHERE NOT trigger_frozen AND NOT function_frozen
    ON CONFLICT (singleton) DO NOTHING;
  `;
}

export function eventLogSequenceAllocatorSql({ schema = "public", table = "event_log", trigger = "event_log_sequence_allocation" } = {}) {
  const qualifiedTable = `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
  const qualifiedFunction = `${quoteIdentifier(schema)}."assign_event_log_sequence"`;
  const quotedTrigger = quoteIdentifier(trigger);
  const boundarySql = eventLogAllocatorBoundarySql({ schema, table, trigger });

  return `
    ${boundarySql}

    CREATE OR REPLACE FUNCTION ${qualifiedFunction}()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      next_sequence integer;
    BEGIN
      PERFORM pg_advisory_xact_lock(
        hashtextextended(NEW.aggregate_type || ':' || NEW.aggregate_id, 0)
      );

      SELECT COALESCE(MAX(sequence_number), 0) + 1
        INTO next_sequence
        FROM ${qualifiedTable}
       WHERE aggregate_type = NEW.aggregate_type
         AND aggregate_id = NEW.aggregate_id;

      NEW.sequence_number := next_sequence;
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS ${quotedTrigger} ON ${qualifiedTable};

    CREATE TRIGGER ${quotedTrigger}
    BEFORE INSERT ON ${qualifiedTable}
    FOR EACH ROW
    EXECUTE FUNCTION ${qualifiedFunction}();

    ${boundarySql}
  `;
}