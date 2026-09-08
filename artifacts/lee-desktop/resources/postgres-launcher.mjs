import { spawnSync } from "node:child_process";
import { closeSync, openSync, writeSync } from "node:fs";

const executable = process.env.LEE_POSTGRES_CTL;
const args = JSON.parse(process.env.LEE_POSTGRES_ARGS ?? "[]");
if (!executable) process.exit(1);

const launcherLog = process.env.LEE_POSTGRES_LAUNCHER_LOG;
const logFd = launcherLog ? openSync(launcherLog, "a", 0o600) : undefined;
const result = spawnSync(executable, args, {
  windowsHide: true,
  ...(logFd === undefined ? {} : { stdio: ["ignore", logFd, logFd] }),
  encoding: "utf8",
  env: process.env,
});
if (logFd !== undefined) {
  closeSync(logFd);
}
if (launcherLog) {
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}\n` : ""}`;
  if (output) {
    const fd = openSync(launcherLog, "a", 0o600);
    try {
      writeSync(fd, output);
    } finally {
      closeSync(fd);
    }
  }
}
process.exit(result.status ?? 1);
