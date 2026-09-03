import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    CREATE OR REPLACE FUNCTION assign_event_log_sequence()
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
        FROM event_log
       WHERE aggregate_type = NEW.aggregate_type
         AND aggregate_id = NEW.aggregate_id;

      NEW.sequence_number := next_sequence;
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS event_log_sequence_allocation ON event_log;

    CREATE TRIGGER event_log_sequence_allocation
    BEFORE INSERT ON event_log
    FOR EACH ROW
    EXECUTE FUNCTION assign_event_log_sequence();

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
  console.info("event_log append-only trigger installed");
} finally {
  await pool.end();
}