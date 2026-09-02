import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const releaseDir = resolve(process.argv[2] ?? "artifacts/lee-desktop/release");
const manifestFiles = readdirSync(releaseDir)
  .filter(
    (file) => file.startsWith("release-manifest-") && file.endsWith(".json"),
  )
  .sort((a, b) => a.localeCompare(b));

if (manifestFiles.length === 0) {
  throw new Error(`No release manifests found in ${releaseDir}.`);
}

for (const manifestFile of manifestFiles) {
  const manifest = JSON.parse(
    readFileSync(join(releaseDir, manifestFile), "utf8"),
  );
  if (
    manifest.schemaVersion !== 1 ||
    !manifest.platform ||
    !manifest.version ||
    !manifest.checksumFile ||
    !Array.isArray(manifest.artifacts) ||
    manifest.artifacts.length === 0 ||
    !Array.isArray(manifest.updaterMetadata) ||
    manifest.updaterMetadata.length === 0
  ) {
    throw new Error(`${manifestFile} is not a valid release manifest.`);
  }

  const checksumLines = [];
  for (const artifact of manifest.artifacts ?? []) {
    const artifactPath = join(releaseDir, artifact.file);
    if (!existsSync(artifactPath))
      throw new Error(`${manifestFile} references missing ${artifact.file}.`);
    const contents = readFileSync(artifactPath);
    const sha256 = createHash("sha256").update(contents).digest("hex");
    if (sha256 !== artifact.sha256 || contents.length !== artifact.size) {
      throw new Error(`Checksum or size mismatch for ${artifact.file}.`);
    }
    const sidecar = readFileSync(`${artifactPath}.sha256`, "ascii").trim();
    if (sidecar !== `${artifact.sha256}  ${artifact.file}`) {
      throw new Error(`Checksum sidecar mismatch for ${artifact.file}.`);
    }
    checksumLines.push(`${artifact.sha256}  ${artifact.file}`);
  }

  const checksumPath = join(releaseDir, manifest.checksumFile);
  if (readFileSync(checksumPath, "ascii").trim() !== checksumLines.join("\n")) {
    throw new Error(`Checksum manifest mismatch for ${manifest.platform}.`);
  }

  for (const metadataFile of manifest.updaterMetadata ?? []) {
    const metadata = readFileSync(join(releaseDir, metadataFile), "utf8");
    if (!metadata.includes(`version: ${manifest.version}`)) {
      throw new Error(
        `${metadataFile} does not describe version ${manifest.version}.`,
      );
    }
  }
  console.log(`Verified ${manifest.platform} release ${manifest.version}.`);
}
