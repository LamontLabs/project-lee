import pg from "pg";
import { eventLogAllocatorBoundarySql } from "./event-log-sequence.mjs";

const { Pool } = pg;
const instanceId = process.env.LEE_INSTANCE_ID;
const databaseName = process.env.LEE_DATABASE_NAME;

if (process.env.NODE_ENV !== "production") {
  throw new Error("The allocator-boundary migration is Production-only.");
}
if (process.env.LEE_ALLOW_EVENT_LOG_CUTOVER_MIGRATION !== "yes") {
  throw new Error("Set LEE_ALLOW_EVENT_LOG_CUTOVER_MIGRATION=yes to confirm the targeted migration.");
}
if (!process.env.DATABASE_URL || !instanceId || !databaseName) {
  throw new Error("Production database and installation identity configuration are required.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let client;

try {
  client = await pool.connect();
  await client.query("BEGIN");

  const database = await client.query("SELECT current_database() AS name");
  if (database.rows[0]?.name !== databaseName) {
    throw new Error("The Production database name does not match LEE_DATABASE_NAME.");
  }

  const identity = await client.query(
    `SELECT
       count(*)::int AS row_count,
       count(*) FILTER (
         WHERE instance_id = $1
           AND database_name = $2
           AND brain_name = 'canonical'
       )::int AS matching_count
     FROM public.lee_runtime_identity
     WHERE identity_key = true`,
    [instanceId, databaseName],
  );
  if (identity.rows[0]?.row_count !== 1 || identity.rows[0]?.matching_count !== 1) {
    throw new Error("Production identity verification failed; no migration was applied.");
  }

  await client.query("LOCK TABLE public.event_log IN SHARE MODE");
  await client.query(eventLogAllocatorBoundarySql());

  const marker = await client.query(
    `SELECT count(*)::int AS row_count
       FROM public.lee_event_log_allocator_state`,
  );
  if (marker.rows[0]?.row_count !== 1) {
    throw new Error("Exactly one valid allocator cutover record must exist after migration.");
  }

  await client.query("COMMIT");
  console.info("Production allocator cutover record verified; Event Log and identity rows were not changed.");
} catch (error) {
  await client?.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client?.release();
  await pool.end();
}