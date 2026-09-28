import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "@workspace/db";
import { eventLogSequenceAllocatorSql } from "../../../lib/db/src/event-log-sequence.mjs";

test("allocator serializes concurrent writes and assigns every row in multi-row inserts", async () => {
  assert.equal(process.env.NODE_ENV, "development", "allocator integration test is development-only");
  assert.equal(process.env.LEE_ALLOW_EVENT_LOG_ALLOCATOR_TEST, "yes", "explicit opt-in is required");
  assert.equal(process.env.LEE_INSTANCE_ID, undefined, "refusing to run with a configured installation identity");

  const schema = `lee_sequence_test_${randomUUID().replaceAll("-", "")}`;
  const quotedSchema = `"${schema}"`;
  await pool.query(`CREATE SCHEMA ${quotedSchema}`);
  try {
    await pool.query(`
      CREATE TABLE ${quotedSchema}.event_log (
        id text PRIMARY KEY,
        aggregate_type text NOT NULL,
        aggregate_id text NOT NULL,
        sequence_number integer NOT NULL DEFAULT 1
      )
    `);
    await pool.query(eventLogSequenceAllocatorSql({ schema }));

    const initialBoundary = await pool.query<{ cutover_xid: string }>(`
      SELECT cutover_xid::text
      FROM ${quotedSchema}.lee_event_log_allocator_state
      WHERE singleton = true
    `);
    assert.equal(initialBoundary.rows.length, 1);
    const stableCutoverXid = BigInt(initialBoundary.rows[0]!.cutover_xid);

    await pool.query(eventLogSequenceAllocatorSql({ schema }));
    const rerunBoundary = await pool.query<{
      cutover_xid: string;
      current_catalog_xid: string;
    }>(`
      WITH snapshot AS (
        SELECT pg_snapshot_xmax(pg_current_snapshot())::text::numeric AS xmax
      )
      SELECT state.cutover_xid::text AS cutover_xid,
        GREATEST(
          (snapshot.xmax - mod(mod(snapshot.xmax - allocator_trigger.xmin::text::numeric, 4294967296) + 4294967296, 4294967296))::text::numeric,
          (snapshot.xmax - mod(mod(snapshot.xmax - allocator_function.xmin::text::numeric, 4294967296) + 4294967296, 4294967296))::text::numeric
        )::text AS current_catalog_xid
      FROM ${quotedSchema}.lee_event_log_allocator_state state
      JOIN pg_trigger allocator_trigger
        ON allocator_trigger.tgrelid = '${schema}.event_log'::regclass
        AND allocator_trigger.tgname = 'event_log_sequence_allocation'
      JOIN pg_proc allocator_function ON allocator_function.oid = allocator_trigger.tgfoid
      CROSS JOIN snapshot
      WHERE state.singleton = true
    `);
    assert.equal(BigInt(rerunBoundary.rows[0]!.cutover_xid), stableCutoverXid);
    assert.ok(BigInt(rerunBoundary.rows[0]!.current_catalog_xid) > stableCutoverXid);
    const wrappedXids = await pool.query<{ expanded_xid: string }>(`
      WITH xid_cases(snapshot_xmax, raw_xid) AS (
        VALUES
          (4294967300::numeric, 4294967290::numeric),
          (4294967310::numeric, 5::numeric)
      )
      SELECT (
        snapshot_xmax - mod(
          mod(snapshot_xmax - raw_xid, 4294967296) + 4294967296,
          4294967296
        )
      )::text AS expanded_xid
      FROM xid_cases
      ORDER BY snapshot_xmax
    `);
    assert.deepEqual(wrappedXids.rows.map((row) => row.expanded_xid), ["4294967290", "4294967301"]);

    const boundarySchema = `lee_sequence_boundary_${randomUUID().replaceAll("-", "")}`;
    const quotedBoundarySchema = `"${boundarySchema}"`;
    await pool.query(`CREATE SCHEMA ${quotedBoundarySchema}`);
    try {
      await pool.query(`
        CREATE TABLE ${quotedBoundarySchema}.event_log (
          id text PRIMARY KEY,
          aggregate_type text NOT NULL,
          aggregate_id text NOT NULL,
          sequence_number integer NOT NULL DEFAULT 1
        )
      `);
      const boundaryClient = await pool.connect();
      try {
        await boundaryClient.query("BEGIN");
        await boundaryClient.query(`
          INSERT INTO ${quotedBoundarySchema}.event_log (id, aggregate_type, aggregate_id)
          VALUES ('same-transaction', 'test', 'install')
        `);
        await boundaryClient.query(eventLogSequenceAllocatorSql({ schema: boundarySchema }));
        await boundaryClient.query("COMMIT");
      } finally {
        await boundaryClient.query("ROLLBACK").catch(() => undefined);
        boundaryClient.release();
      }

      const sharedTransaction = await pool.query<{ cutover_xid: string; event_xid: string }>(`
        WITH snapshot AS (
          SELECT pg_snapshot_xmax(pg_current_snapshot())::text::numeric AS xmax
        )
        SELECT state.cutover_xid::text AS cutover_xid,
          CASE WHEN event.xmin = '2'::xid THEN '2'::xid8::text
            ELSE ((snapshot.xmax - mod(mod(snapshot.xmax - event.xmin::text::numeric, 4294967296) + 4294967296, 4294967296))::text)::xid8::text
          END AS event_xid
        FROM ${quotedBoundarySchema}.lee_event_log_allocator_state state
        JOIN ${quotedBoundarySchema}.event_log event ON event.id = 'same-transaction'
        CROSS JOIN snapshot
        WHERE state.singleton = true
      `);
      assert.equal(sharedTransaction.rows.length, 1);
      assert.equal(sharedTransaction.rows[0]?.event_xid, sharedTransaction.rows[0]?.cutover_xid);
    } finally {
      await pool.query(`DROP SCHEMA ${quotedBoundarySchema} CASCADE`);
    }

    const bulkRows = await pool.query<{ sequence_number: number }>(`
      INSERT INTO ${quotedSchema}.event_log (id, aggregate_type, aggregate_id)
      VALUES
        ('bulk-1', 'test', 'bulk'),
        ('bulk-2', 'test', 'bulk'),
        ('bulk-3', 'test', 'bulk')
      RETURNING sequence_number
    `);
    assert.deepEqual(bulkRows.rows.map((row) => row.sequence_number), [1, 2, 3]);

    const first = await pool.connect();
    const second = await pool.connect();
    try {
      await first.query("BEGIN");
      const firstInsert = await first.query<{ sequence_number: number }>(`
        INSERT INTO ${quotedSchema}.event_log (id, aggregate_type, aggregate_id)
        VALUES ('concurrent-a', 'test', 'concurrent')
        RETURNING sequence_number
      `);
      assert.equal(firstInsert.rows[0]?.sequence_number, 1);

      await second.query("BEGIN");
      let secondSettled = false;
      const secondInsertPromise = second.query<{ sequence_number: number }>(`
        INSERT INTO ${quotedSchema}.event_log (id, aggregate_type, aggregate_id)
        VALUES ('concurrent-b', 'test', 'concurrent')
        RETURNING sequence_number
      `).then((result) => {
        secondSettled = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 75));
      assert.equal(secondSettled, false, "the competing insert must wait for the aggregate lock");

      await first.query("COMMIT");
      const secondInsert = await secondInsertPromise;
      assert.equal(secondInsert.rows[0]?.sequence_number, 2);
      await second.query("COMMIT");
    } finally {
      await first.query("ROLLBACK").catch(() => undefined);
      await second.query("ROLLBACK").catch(() => undefined);
      first.release();
      second.release();
    }

    const rolledBack = await pool.connect();
    try {
      await rolledBack.query("BEGIN");
      await rolledBack.query(`
        INSERT INTO ${quotedSchema}.event_log (id, aggregate_type, aggregate_id)
        VALUES ('rollback-only', 'test', 'rollback')
      `);
      await rolledBack.query("ROLLBACK");
    } finally {
      rolledBack.release();
    }

    const afterRollback = await pool.query<{ sequence_number: number }>(`
      INSERT INTO ${quotedSchema}.event_log (id, aggregate_type, aggregate_id)
      VALUES ('after-rollback', 'test', 'rollback')
      RETURNING sequence_number
    `);
    assert.equal(afterRollback.rows[0]?.sequence_number, 1);
  } finally {
    await pool.query(`DROP SCHEMA ${quotedSchema} CASCADE`);
  }
});