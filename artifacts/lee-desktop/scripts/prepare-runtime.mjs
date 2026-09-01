import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(desktop, "../..");
const consoleDist = resolve(root, "artifacts/lee-console/dist/public");
const apiDist = resolve(root, "artifacts/api-server/dist");
const dbMigrations = resolve(root, "lib/db/drizzle");
const migrationEntry = resolve(root, "lib/db/src/desktop-migrate.ts");
const resources = resolve(desktop, "resources");
const require = createRequire(import.meta.url);
const { build } = require(resolve(root, "artifacts/api-server/node_modules/esbuild"));

if (!existsSync(consoleDist)) throw new Error("Console build is missing. Run @workspace/lee-console build first.");
if (!existsSync(apiDist)) throw new Error("API build is missing. Run @workspace/api-server build first.");
if (!existsSync(dbMigrations)) throw new Error("Database migrations are missing. Run @workspace/db generate first.");
await rm(resolve(resources, "console"), { recursive: true, force: true });
await rm(resolve(resources, "api-server"), { recursive: true, force: true });
await rm(resolve(resources, "migrations"), { recursive: true, force: true });
await rm(resolve(resources, "migrate-runtime.mjs"), { force: true });
await mkdir(resources, { recursive: true });
await cp(consoleDist, resolve(resources, "console"), { recursive: true });
await cp(apiDist, resolve(resources, "api-server"), { recursive: true });
await cp(dbMigrations, resolve(resources, "migrations"), { recursive: true });
await build({
  entryPoints: [migrationEntry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: resolve(resources, "migrate-runtime.mjs"),
  external: ["pg-native"],
  logLevel: "info",
});