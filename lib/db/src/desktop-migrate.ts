import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running desktop migrations.");
}

const migrationsFolder = process.env.LEE_MIGRATIONS_DIR
  ?? join(dirname(fileURLToPath(import.meta.url)), "migrations");
const pool = new Pool({ connectionString: databaseUrl });

try {
  await migrate(drizzle(pool), { migrationsFolder });
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
  console.log(`Desktop database migrations completed from ${migrationsFolder}.`);
} finally {
  await pool.end();
}