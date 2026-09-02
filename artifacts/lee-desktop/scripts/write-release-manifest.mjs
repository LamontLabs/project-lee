import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(desktopRoot, "release");
const platform = process.argv[process.argv.indexOf("--platform") + 1];
const versionArgument = process.argv[process.argv.indexOf("--version") + 1];

const artifactExtensions = {
  windows: [".exe"],
  macos: [".dmg", ".zip"],
  linux: [".AppImage", ".deb", ".rpm", ".tar.gz"],
};
const metadataByPlatform = {
  windows: "latest.yml",
  macos: "latest-mac.yml",
  linux: "latest-linux.yml",
};

if (!artifactExtensions[platform] || !metadataByPlatform[platform]) {
  throw new Error(
    "Usage: node scripts/write-release-manifest.mjs --platform windows|macos|linux",
  );
}

const packageJson = JSON.parse(
  readFileSync(join(desktopRoot, "package.json"), "utf8"),
);
const version = versionArgument ?? packageJson.version;
const entries = readdirSync(releaseDir, { withFileTypes: true });
const artifacts = entries
  .filter(
    (entry) =>
      entry.isFile() &&
      artifactExtensions[platform].some((extension) =>
        entry.name.endsWith(extension),
      ),
  )
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b))
  .map((file) => {
    const contents = readFileSync(join(releaseDir, file));
    return {
      file,
      sha256: createHash("sha256").update(contents).digest("hex"),
      size: statSync(join(releaseDir, file)).size,
    };
  });

if (artifacts.length === 0) {
  throw new Error(`No ${platform} distributables found in ${releaseDir}.`);
}

const updaterMetadata = entries
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith("latest") &&
      entry.name.endsWith(".yml"),
  )
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));
const expectedMetadata = metadataByPlatform[platform];
if (!updaterMetadata.includes(expectedMetadata)) {
  throw new Error(
    `Missing ${expectedMetadata}; electron-updater cannot consume this release.`,
  );
}

for (const artifact of artifacts) {
  writeFileSync(
    join(releaseDir, `${artifact.file}.sha256`),
    `${artifact.sha256}  ${artifact.file}\n`,
    "ascii",
  );
}

const checksumFile = `SHA256SUMS-${platform}.txt`;
writeFileSync(
  join(releaseDir, checksumFile),
  `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.file}`).join("\n")}\n`,
  "ascii",
);

const manifest = {
  schemaVersion: 1,
  version,
  platform,
  artifacts,
  updaterMetadata,
  checksumFile,
};
writeFileSync(
  join(releaseDir, `release-manifest-${platform}.json`),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote ${platform} release metadata for ${artifacts.length} artifact(s).`,
);
