import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const repository = process.env.GITHUB_REPOSITORY ?? "lamontlabs/project-lee";
const currentTag = process.env.GITHUB_REF_NAME;
const platform = process.argv[process.argv.indexOf("--platform") + 1];
const currentDir = resolve(process.argv[process.argv.indexOf("--current-dir") + 1]);
const previousDir = resolve(process.argv[process.argv.indexOf("--previous-dir") + 1]);
const recordPath = resolve(process.argv[process.argv.indexOf("--record") + 1]);
const token = process.env.GH_TOKEN;
const architecture = process.argv.includes("--architecture")
  ? process.argv[process.argv.indexOf("--architecture") + 1]
  : undefined;

const metadataByPlatform = { windows: "latest.yml", macos: "latest-mac.yml", linux: "latest-linux.yml" };
const artifactPatternByPlatform = {
  windows: (name) => name.endsWith(".exe"),
  macos: (name) => name.endsWith(".zip") && (!architecture || name.endsWith(`-${architecture}.zip`)),
  linux: (name) => name.endsWith(".AppImage"),
};

if (!currentTag || !token || !metadataByPlatform[platform] || !artifactPatternByPlatform[platform] || (platform === "macos" && !["x64", "arm64"].includes(architecture))) {
  throw new Error("A release tag, GH_TOKEN, and supported platform are required.");
}

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status}): ${path}`);
  return response.json();
}

const releases = await github(`/repos/${repository}/releases?per_page=100`);
const current = releases.find((release) => release.tag_name === currentTag && !release.draft && !release.prerelease);
if (!current) throw new Error(`Published stable release ${currentTag} was not found.`);
const previous = releases
  .filter((release) => !release.draft && !release.prerelease && release.tag_name !== currentTag)
  .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())[0];

const record = { platform, architecture, currentTag, currentVersion: current.tag_name.replace(/^lee-v/, ""), previousTag: previous?.tag_name ?? null, status: previous ? "ready" : "skipped", reason: previous ? undefined : "No previous stable release exists yet." };
if (!previous) {
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(`Skipping ${platform} updater install smoke: no previous stable release exists.`);
  process.exit(0);
}

async function downloadRelease(release, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const required = release.assets.filter((asset) => asset.name === metadataByPlatform[platform] || artifactPatternByPlatform[platform](asset.name));
  if (!required.some((asset) => asset.name === metadataByPlatform[platform])) throw new Error(`${release.tag_name} is missing ${metadataByPlatform[platform]}.`);
  if (!required.some((asset) => artifactPatternByPlatform[platform](asset.name))) throw new Error(`${release.tag_name} has no ${platform} updater artifact.`);
  for (const asset of required) {
    const response = await fetch(asset.browser_download_url, { headers: { Accept: "application/octet-stream", Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Could not download ${asset.name} from ${release.tag_name} (${response.status}).`);
    await writeFile(join(targetDir, asset.name), Buffer.from(await response.arrayBuffer()));
  }
}

await downloadRelease(current, currentDir);
await downloadRelease(previous, previousDir);
await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
console.log(`Downloaded ${platform} updater assets for ${previous.tag_name} -> ${current.tag_name}.`);