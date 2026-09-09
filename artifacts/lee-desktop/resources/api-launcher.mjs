import { appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const logPath = process.env.LEE_CHILD_OUTPUT_LOG;

function record(message) {
  if (!logPath) return;
  try {
    appendFileSync(logPath, `${new Date().toISOString()} api-launcher:${message}\n`, "utf8");
  } catch {
    // The API must still attempt startup when diagnostics cannot be written.
  }
}

record(`entry exec=${process.execPath} cwd=${process.cwd()}`);
const apiPath = fileURLToPath(new URL("./api-server/index.mjs", import.meta.url));
const api = spawn(process.execPath, [apiPath], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});
record(`child-start pid=${api.pid ?? "unknown"} path=${apiPath}`);
const startupTimeout = setTimeout(() => {
  record("startup-timeout");
  api.kill();
  process.exit(1);
}, 30_000);
api.once("error", (error) => {
  clearTimeout(startupTimeout);
  record(`startup-error ${error.stack ?? error.message}`);
  process.exit(1);
});
api.once("exit", (code, signal) => {
  clearTimeout(startupTimeout);
  record(`child-exit code=${code ?? "null"} signal=${signal ?? "null"}`);
  process.exit(code ?? 1);
});