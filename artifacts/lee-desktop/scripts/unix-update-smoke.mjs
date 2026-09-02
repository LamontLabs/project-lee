import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { verifyUpdaterFeed } from "./verify-updater-feed.mjs";

const platform = process.argv[process.argv.indexOf("--platform") + 1];
const architecture = process.argv.includes("--architecture")
  ? process.argv[process.argv.indexOf("--architecture") + 1]
  : process.arch === "arm64" ? "arm64" : "x64";
const currentDir = resolve(process.argv[process.argv.indexOf("--current-dir") + 1]);
const previousDir = resolve(process.argv[process.argv.indexOf("--previous-dir") + 1]);
const expectedVersion = process.argv[process.argv.indexOf("--expected-version") + 1];
const output = resolve(process.argv[process.argv.indexOf("--output") + 1]);
const selection = JSON.parse(await readFile(process.argv[process.argv.indexOf("--record") + 1], "utf8"));

if (selection.status === "skipped") {
  await writeFile(output, `${JSON.stringify({ ...selection, verification: "skipped" }, null, 2)}\n`, "utf8");
  process.exit(0);
}
if (!["macos", "linux"].includes(platform)) throw new Error(`Unsupported Unix platform: ${platform}`);
if (platform === "macos" && !["x64", "arm64"].includes(architecture)) {
  throw new Error(`Unsupported macOS updater architecture: ${architecture || "(missing)"}`);
}

const currentFeed = verifyUpdaterFeed({ releaseDir: currentDir, platform, expectedVersion });
const previousFeed = verifyUpdaterFeed({ releaseDir: previousDir, platform });
const metadataFile = { macos: "latest-mac.yml", linux: "latest-linux.yml" }[platform];
const artifact = currentFeed.files.find((file) => platform === "linux"
  ? file.file.endsWith(".AppImage")
  : file.file.endsWith(`-${architecture}.zip`));
if (!artifact) throw new Error(`No runnable ${platform} updater artifact was found.`);

const root = await mkdir(join(tmpdir(), `lee-update-smoke-${platform}-`), { recursive: true });
const feedRoot = join(root, "current-feed");
const tamperedRoot = join(root, "tampered-feed");
const installRoot = join(root, "previous-install");
await cp(currentDir, feedRoot, { recursive: true });
await cp(currentDir, tamperedRoot, { recursive: true });
const tamperedPath = join(tamperedRoot, artifact.file);
const tamperedContents = await readFile(tamperedPath);
tamperedContents[tamperedContents.length - 1] ^= 0xff;
await writeFile(tamperedPath, tamperedContents);
await mkdir(installRoot, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} failed while preparing the ${platform} update smoke test.`);
}

const previousArtifact = previousFeed.files.find((file) => platform === "linux"
  ? file.file.endsWith(".AppImage")
  : file.file.endsWith(`-${architecture}.zip`));
if (!previousArtifact) throw new Error(`No runnable previous ${platform} artifact was found.`);
let appPath;
if (platform === "linux") {
  appPath = join(installRoot, basename(previousArtifact.file));
  await cp(join(previousDir, previousArtifact.file), appPath);
  run("chmod", ["+x", appPath]);
} else {
  run("ditto", ["-x", "-k", join(previousDir, previousArtifact.file), installRoot]);
  appPath = join(installRoot, "Project LEE.app", "Contents", "MacOS", "Project LEE");
}

async function startFeed(rootDir) {
  const readyFile = join(rootDir, "feed-ready.json");
  const server = spawn(process.execPath, ["scripts/update-feed-server.mjs", "--root", rootDir, "--port", "0", "--ready-file", readyFile], { cwd: resolve(dirname(new URL(import.meta.url).pathname), ".."), stdio: ["ignore", "pipe", "inherit"] });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { return { server, url: JSON.parse(await readFile(readyFile, "utf8")).url }; } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 100)); }
  }
  server.kill("SIGTERM");
  throw new Error("Update feed server did not become ready.");
}

async function waitForJson(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { return JSON.parse(await readFile(path, "utf8")); } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 100)); }
  }
  throw new Error(`Timed out waiting for ${path}.`);
}

async function waitForChild(child) {
  return new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
}

async function runApp(feedUrl, { install = false, interrupt = null } = {}) {
  const resultFile = join(root, `${interrupt ?? (install ? "valid" : "tampered")}-result.json`);
  await rm(resultFile, { force: true });
  const environment = {
    ...process.env,
    HOME: join(root, "home"),
    XDG_CONFIG_HOME: join(root, "appdata"),
    LEE_SMOKE_UPDATE_FEED_URL: feedUrl,
    LEE_SMOKE_UPDATE_EXPECTED_VERSION: expectedVersion,
    LEE_SMOKE_UPDATE_RESULT_FILE: resultFile,
    LEE_SMOKE_UPDATE_INSTALL: install ? "1" : "0",
    ...(interrupt ? {
      LEE_SMOKE_UPDATE_INTERRUPT: interrupt,
      LEE_SMOKE_UPDATE_INTERRUPT_FILE: resultFile,
      ...(interrupt === "install" ? { LEE_SMOKE_UPDATE_INTERRUPT_DELAY_MS: "30000" } : {}),
    } : {}),
    ...(platform === "linux" ? { APPIMAGE: appPath } : {}),
  };
  const child = spawn(appPath, ["--lee-smoke-exit"], { cwd: dirname(appPath), env: environment, stdio: "inherit" });
  if (interrupt === "install") {
    const result = await waitForJson(resultFile, 180_000);
    if (result.status !== "interrupted" || result.phase !== "install") {
      throw new Error(`Install interruption did not reach the expected phase: ${JSON.stringify(result)}`);
    }
    child.kill("SIGKILL");
    await waitForChild(child).catch(() => 1);
    return { exitCode: 1, result };
  }
  const exitCode = await new Promise((resolveExit, reject) => {
    const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Packaged updater smoke process timed out.")); }, 180_000);
    child.once("error", reject);
    child.once("exit", (code) => { clearTimeout(timeout); resolveExit(code); });
  });
  const result = JSON.parse(await readFile(resultFile, "utf8"));
  return { exitCode, result };
}

async function runPreviousRuntime(label) {
  const statusFile = join(root, `${label}-runtime-status.json`);
  await rm(statusFile, { force: true });
  const environment = {
    ...process.env,
    HOME: join(root, "home"),
    XDG_CONFIG_HOME: join(root, "appdata"),
    LEE_SMOKE_STATUS_FILE: statusFile,
    ...(platform === "linux" ? { APPIMAGE: appPath } : {}),
  };
  const child = spawn(appPath, ["--lee-smoke-exit"], { cwd: dirname(appPath), env: environment, stdio: "inherit" });
  const exitCode = await waitForChild(child);
  const status = await waitForJson(statusFile, 30_000);
  if (exitCode !== 0 || status.state !== "live" || status.database !== "configured" || status.migration !== "complete" || status.contract !== "live" || status.version !== previousFeed.version) {
    throw new Error(`Previous LEE runtime was not usable after ${label}: ${JSON.stringify({ exitCode, status })}`);
  }
  return status;
}

await runPreviousRuntime("before-interruption");
const tamperedFeed = await startFeed(tamperedRoot);
const tampered = await runApp(tamperedFeed.url);
tamperedFeed.server.kill("SIGTERM");
if (tampered.result.status !== "error") throw new Error(`Tampered ${platform} update was not rejected: ${JSON.stringify(tampered.result)}`);

const interruptedDownloadFeed = await startFeed(feedRoot);
const interruptedDownload = await runApp(interruptedDownloadFeed.url, { interrupt: "download" });
interruptedDownloadFeed.server.kill("SIGTERM");
if (interruptedDownload.result.status !== "interrupted" || interruptedDownload.result.phase !== "download") {
  throw new Error(`Download interruption did not produce an interruption record: ${JSON.stringify(interruptedDownload.result)}`);
}
await runPreviousRuntime("after-download-interruption");

const interruptedInstallFeed = await startFeed(feedRoot);
const interruptedInstall = await runApp(interruptedInstallFeed.url, { interrupt: "install" });
interruptedInstallFeed.server.kill("SIGTERM");
await runPreviousRuntime("after-install-interruption");

const validFeed = await startFeed(feedRoot);
const valid = await runApp(validFeed.url, { install: true });
validFeed.server.kill("SIGTERM");
if (valid.result.status !== "installed" || valid.result.version !== expectedVersion) {
  throw new Error(`Valid ${platform} update did not install cleanly: ${JSON.stringify(valid.result)}`);
}
if (platform === "macos") {
  run("codesign", ["--verify", "--deep", "--strict", appPath]);
  run("spctl", ["--assess", "--type", "execute", "--verbose=4", appPath]);
}

await writeFile(output, `${JSON.stringify({
  ...selection,
  verification: "passed",
  update: {
    previousVersion: previousFeed.version,
    currentVersion: currentFeed.version,
    metadataFile,
    tamperedRejected: true,
    downloadInterrupted: interruptedDownload.result.status === "interrupted",
    installInterrupted: interruptedInstall.result.status === "interrupted",
    previousLaunchesAfterInterruption: 2,
    validInstalled: true,
    artifactSha512: createHash("sha512").update(await readFile(join(currentDir, artifact.file))).digest("base64"),
  },
}, null, 2)}\n`, "utf8");
await rm(root, { recursive: true, force: true });
console.log(`Verified ${platform} updater: tampered update rejected and ${previousFeed.version} -> ${currentFeed.version} installed.`);