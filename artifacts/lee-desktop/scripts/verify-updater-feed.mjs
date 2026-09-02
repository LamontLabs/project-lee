import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const metadataByPlatform = {
  windows: "latest.yml",
  macos: "latest-mac.yml",
  linux: "latest-linux.yml",
};

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function parseMetadata(text) {
  const version = text.match(/^version:\s*['"]?([^'"\r\n]+)['"]?\s*$/m)?.[1];
  const files = [...text.matchAll(/^\s*-\s+url:\s*(\S+)\s*$\r?\n\s+sha512:\s*(\S+)\s*$\r?\n\s+size:\s*(\d+)\s*$/gm)]
    .map((match) => ({ file: basename(decodeURIComponent(match[1])), sha512: match[2], size: Number(match[3]) }));
  if (!version || files.length === 0) throw new Error("Updater metadata must contain a version and at least one file entry.");
  return { version, files };
}

export function verifyUpdaterFeed({ releaseDir, platform, expectedVersion }) {
  const metadataFile = metadataByPlatform[platform];
  if (!metadataFile) throw new Error(`Unsupported platform: ${platform}`);
  const metadataPath = join(resolve(releaseDir), metadataFile);
  if (!existsSync(metadataPath)) throw new Error(`Missing updater metadata: ${metadataFile}`);
  const metadata = parseMetadata(readFileSync(metadataPath, "utf8"));
  if (expectedVersion && metadata.version !== expectedVersion) {
    throw new Error(`${metadataFile} describes ${metadata.version}, expected ${expectedVersion}.`);
  }

  const verifiedFiles = metadata.files.map((entry) => {
    const artifactPath = join(resolve(releaseDir), entry.file);
    if (!existsSync(artifactPath)) throw new Error(`${metadataFile} references missing ${entry.file}.`);
    const contents = readFileSync(artifactPath);
    const sha512 = createHash("sha512").update(contents).digest("base64");
    if (sha512 !== entry.sha512 || contents.length !== entry.size) {
      throw new Error(`Updater checksum or size mismatch for ${entry.file}.`);
    }
    return { file: entry.file, size: contents.length, sha512 };
  });
  return { platform, metadataFile, version: metadata.version, files: verifiedFiles };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const releaseDir = argument("--release-dir", "artifacts/lee-desktop/release");
  const platform = argument("--platform");
  const expectedVersion = argument("--expected-version");
  const recordPath = argument("--record");

  try {
    const result = verifyUpdaterFeed({ releaseDir, platform, expectedVersion });
    if (recordPath) writeFileSync(resolve(recordPath), `${JSON.stringify({ status: "passed", ...result }, null, 2)}\n`, "utf8");
    console.log(`Verified ${result.platform} updater feed for release ${result.version}: ${result.files.map((file) => file.file).join(", ")}`);
  } catch (error) {
    if (recordPath) writeFileSync(resolve(recordPath), `${JSON.stringify({ status: "failed", platform, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`, "utf8");
    throw error;
  }
}