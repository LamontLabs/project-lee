import { readFile, writeFile } from "node:fs/promises";

const input = process.argv[process.argv.indexOf("--input") + 1];
const output = process.argv[process.argv.indexOf("--output") + 1];
const record = JSON.parse(await readFile(input, "utf8"));
const checked = record.verification === "passed";
const lines = [
  `# Project LEE signed update verification — ${record.platform}`,
  "",
  `- Current published release: ${record.currentTag ?? "unknown"} (${record.currentVersion ?? "unknown"})`,
  `- Previous stable release: ${record.previousTag ?? "none"}`,
  `- Verification status: ${record.verification ?? record.status}`,
  "",
  `- [${checked ? "x" : " "}] Published updater metadata and artifact checksums match`,
  `- [${checked ? "x" : " "}] Intentionally tampered update rejected`,
  `- [${checked ? "x" : " "}] Valid signed update installed and relaunched`,
];
if (record.reason) lines.push(`- Note: ${record.reason}`);
await writeFile(output, `${lines.join("\n")}\n`, "utf8");