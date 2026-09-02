import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) throw new Error(`Missing required argument ${name}.`);
  return resolve(value);
}

function parseMetadata(text, label) {
  const version = text.match(/^version:\s*['"]?([^'"\r\n]+)['"]?\s*$/m)?.[1];
  const lines = text.split(/\r?\n/);
  const filesStart = lines.findIndex((line) => line === "files:");
  const suffixStart = lines.findIndex((line, index) => index > filesStart && /^(path|releaseDate):/.test(line));
  if (!version || filesStart < 0) throw new Error(`${label} does not contain a valid version/files section.`);
  const fileLines = lines.slice(filesStart + 1, suffixStart < 0 ? lines.length : suffixStart);
  const blocks = [];
  let current = [];
  for (const line of fileLines) {
    if (line.startsWith("  - ")) {
      if (current.length > 0) blocks.push(current.join("\n"));
      current = [line];
    } else if (current.length > 0 && line.trim() !== "") {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  if (blocks.length === 0) throw new Error(`${label} does not contain any updater file entries.`);
  return {
    version,
    blocks,
    releaseDate: text.match(/^releaseDate:\s*(\S+)\s*$/m)?.[1],
  };
}

const x64Path = requiredArgument("--x64");
const arm64Path = requiredArgument("--arm64");
const output = requiredArgument("--output");
const x64 = parseMetadata(await readFile(x64Path, "utf8"), x64Path);
const arm64 = parseMetadata(await readFile(arm64Path, "utf8"), arm64Path);
if (x64.version !== arm64.version) throw new Error(`macOS updater metadata versions differ: ${x64.version} vs ${arm64.version}.`);

const blocks = [...x64.blocks, ...arm64.blocks];
const urls = blocks.map((block) => block.match(/^\s+-\s+url:\s*(\S+)\s*$/m)?.[1]).filter(Boolean);
if (!urls.some((url) => url.includes("x64")) || !urls.some((url) => url.includes("arm64"))) {
  throw new Error("Merged macOS updater metadata must contain both x64 and arm64 artifact URLs.");
}
if (new Set(urls).size !== urls.length) throw new Error("Merged macOS updater metadata contains duplicate artifact URLs.");

const releaseDate = x64.releaseDate ?? arm64.releaseDate;
const merged = [
  `version: ${x64.version}`,
  "files:",
  ...blocks,
  ...(releaseDate ? [`releaseDate: ${releaseDate}`] : []),
  "",
].join("\n");
await writeFile(output, merged, "utf8");
console.log(`Merged macOS updater metadata for ${x64.version}: x64 and arm64 entries.`);