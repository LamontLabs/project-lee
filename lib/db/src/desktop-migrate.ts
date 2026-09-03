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

const instanceId = process.env.LEE_INSTANCE_ID ?? "unmanaged-development";
const databaseName = process.env.LEE_DATABASE_NAME ?? "lee";
if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(instanceId)) {
  throw new Error("LEE_INSTANCE_ID must be a bounded runtime identity.");
}

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

    CREATE TABLE IF NOT EXISTS lee_runtime_identity (
      identity_key boolean PRIMARY KEY DEFAULT true CHECK (identity_key = true),
      instance_id text NOT NULL,
      database_name text NOT NULL,
      brain_name text NOT NULL DEFAULT 'canonical',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const existing = await pool.query<{
    instance_id: string;
    database_name: string;
    brain_name: string;
  }>(`SELECT instance_id, database_name, brain_name FROM lee_runtime_identity WHERE identity_key = true LIMIT 1`);
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO lee_runtime_identity (identity_key, instance_id, database_name, brain_name) VALUES (true, $1, $2, 'canonical')`,
      [instanceId, databaseName],
    );
  } else {
    const identity = existing.rows[0];
    if (identity.instance_id !== instanceId || identity.database_name !== databaseName || identity.brain_name !== "canonical") {
      throw new Error("Canonical database identity mismatch; refusing to run against a replacement Brain.");
    }
  }
  console.log(`Desktop database migrations completed from ${migrationsFolder}.`);
} finally {
  await pool.end();
}