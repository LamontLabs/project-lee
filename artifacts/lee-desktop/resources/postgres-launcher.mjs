import { spawnSync } from "node:child_process";

const executable = process.env.LEE_POSTGRES_CTL;
const args = JSON.parse(process.env.LEE_POSTGRES_ARGS ?? "[]");
if (!executable) process.exit(1);

const result = spawnSync(executable, args, {
  windowsHide: true,
  stdio: "ignore",
  env: process.env,
});
process.exit(result.status ?? 1);