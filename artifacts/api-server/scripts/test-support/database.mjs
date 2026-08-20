import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);
const identifier = (value) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("Unsafe SQL identifier");
  return value;
};

async function sql(statement) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for behavioral database tests");
  const { stdout } = await execFileAsync("psql", [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-Atqc", statement], { maxBuffer: 2 * 1024 * 1024 });
  return stdout.trim();
}

export async function createIsolatedDatabase() {
  const schema = identifier(`behavioral_${randomUUID().replaceAll("-", "")}`);
  await sql(`CREATE SCHEMA ${schema}; CREATE TABLE ${schema}.probe (id integer PRIMARY KEY, value text NOT NULL);`);
  let closed = false;
  return {
    schema,
    async query(statement) {
      if (closed) throw new Error("Isolated database is closed");
      return sql(`SET search_path TO ${schema}, public; ${statement}`);
    },
    async teardown() {
      if (!closed) {
        await sql(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
        closed = true;
      }
    },
  };
}

export async function withIsolatedDatabase(run) {
  const database = await createIsolatedDatabase();
  try {
    return await run(database);
  } finally {
    await database.teardown();
  }
}

export async function isolatedSchemaExists(schema) {
  const safeSchema = identifier(schema);
  return (await sql(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '${safeSchema}');`)) === "t";
}
