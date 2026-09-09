import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const executable = process.env.LEE_POSTGRES_CTL;
const args = JSON.parse(process.env.LEE_POSTGRES_ARGS ?? "[]");
const launcherLog = process.env.LEE_POSTGRES_LAUNCHER_LOG;

const append = (message) => {
  if (launcherLog) appendFileSync(launcherLog, message, { mode: 0o600 });
};

if (!executable) {
  append("launcher-error: missing LEE_POSTGRES_CTL\n");
  process.exit(1);
}

append(`launcher-start: ${executable} ${args.join(" ")}\n`);
const result = spawnSync(executable, args, {
  windowsHide: true,
  encoding: "utf8",
  env: process.env,
  timeout: 60_000,
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}\n` : ""}`;
if (output) append(`native-output: ${output}`);
append(`launcher-exit: status=${result.status ?? "null"} signal=${result.signal ?? "null"}\n`);
process.exit(result.status ?? 1);