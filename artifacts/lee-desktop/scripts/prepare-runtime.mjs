import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(desktop, "../..");
const consoleDist = resolve(root, "artifacts/lee-console/dist/public");
const apiDist = resolve(root, "artifacts/api-server/dist");
const resources = resolve(desktop, "resources");

if (!existsSync(consoleDist)) throw new Error("Console build is missing. Run @workspace/lee-console build first.");
if (!existsSync(apiDist,)) throw new Error("API build is missing. Run @workspace/api-server build first.");
await rm(resolve(resources, "console"), { recursive: true, force: true });
await rm(resolve(resources, "api-server"), { recursive: true, force: true });
await mkdir(resources, { recursive: true });
await cp(consoleDist, resolve(resources, "console"), { recursive: true });
await cp(apiDist, resolve(resources, "api-server"), { recursive: true });