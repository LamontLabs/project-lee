import pg from "pg";
import { eventLogSequenceAllocatorSql } from "./event-log-sequence.mjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(eventLogSequenceAllocatorSql());
  await pool.query(`
    CREATE OR REPLACE FUNCTION prevent_event_log_mutation()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'event_log is append-only; % is not permitted', TG_OP
        USING ERRCODE = '55006';
    END;
    $$;

    DROP TRIGGER IF EXISTS event_log_append_only ON event_log;

    CREATE TRIGGER event_log_append_only
    BEFORE UPDATE OR DELETE ON event_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_event_log_mutation();
  `);
  console.info("event_log sequence allocation and append-only triggers installed");
} finally {
  await pool.end();
}