import { appendFileSync } from "node:fs";

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
const importTimeout = setTimeout(() => {
  record("startup-timeout");
  process.exit(1);
}, 30_000);
try {
  await import("./api-server/index.mjs");
  record("module-ready");
} catch (error) {
  record(`startup-error ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  throw error;
} finally {
  clearTimeout(importTimeout);
}