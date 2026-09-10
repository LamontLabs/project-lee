import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } from "electron";
import { join } from "node:path";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { RuntimeSupervisor } from "./runtime.js";
import { startConsoleServer } from "./static-server.js";

type AutoUpdater = typeof import("electron-updater").autoUpdater;
let autoUpdater: AutoUpdater;
let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let supervisor: RuntimeSupervisor;
let consoleServer: Awaited<ReturnType<typeof startConsoleServer>> | null = null;
let isQuitting = false;
type UpdateState = { status: "unsupported" | "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "interrupted" | "error"; version?: string; message?: string; phase?: "download" | "install" };
let updateState: UpdateState = { status: "idle" };

const isProduction = app.isPackaged;
const smokeUpdateFeedUrl = process.env.LEE_SMOKE_UPDATE_FEED_URL;
const smokeUpdateExpectedVersion = process.env.LEE_SMOKE_UPDATE_EXPECTED_VERSION;
const smokeUpdateResultFile = process.env.LEE_SMOKE_UPDATE_RESULT_FILE;
const smokeUpdateInstall = process.env.LEE_SMOKE_UPDATE_INSTALL === "1";
const smokeUpdateInterrupt = process.env.LEE_SMOKE_UPDATE_INTERRUPT;
const smokeUpdateInterruptFile = process.env.LEE_SMOKE_UPDATE_INTERRUPT_FILE;
const smokeUpdateInterruptDelayMs = Number(process.env.LEE_SMOKE_UPDATE_INTERRUPT_DELAY_MS ?? 250);
const smokeOwnerAuthFile = process.env.LEE_SMOKE_OWNER_AUTH_FILE;
const smokeDiscoveryFile = process.env.LEE_SMOKE_DISCOVERY_FILE;
const smokeExitRequested = process.env.LEE_SMOKE_EXIT === "0"
  ? false
  : app.commandLine.hasSwitch("lee-smoke-exit") || process.env.LEE_SMOKE_EXIT === "1";
const smokeHeadless = process.env.LEE_SMOKE_HEADLESS === "1";
const smokeDebugFile = process.env.LEE_SMOKE_DEBUG_FILE ?? process.env.LEE_SMOKE_DIAGNOSTIC_FILE;
let smokeInterruptionTriggered = false;
let ipcHandlersRegistered = false;
function smokeDebug(event: string, details: Record<string, unknown> = {}): void {
  if (!smokeDebugFile) return;
  try {
    appendFileSync(smokeDebugFile, `${JSON.stringify({ at: new Date().toISOString(), event, ...details })}\n`, { mode: 0o600 });
  } catch { /* Diagnostics must never affect startup. */ }
}
function smokePhase(label: string): void {
  const path = process.env.LEE_SMOKE_DIAGNOSTIC_FILE;
  if (!path) return;
  try { appendFileSync(path, `${new Date().toISOString()} main:${label}\n`, { mode: 0o600 }); } catch { /* Diagnostics must never affect startup. */ }
}
smokeDebug("module-loaded", {
  argv: process.argv,
  smokeExitRequested,
  smokeHeadless,
  commandLineSmokeExit: app.commandLine.hasSwitch("lee-smoke-exit"),
  statusFile: Boolean(process.env.LEE_SMOKE_STATUS_FILE),
});
if (smokeDebugFile) {
  process.on("uncaughtException", (error) => {
    smokeDebug("uncaught-exception", { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    app.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    smokeDebug("unhandled-rejection", { reason: reason instanceof Error ? reason.message : String(reason), stack: reason instanceof Error ? reason.stack : undefined });
    app.exit(1);
  });
  app.on("ready", () => smokeDebug("app-ready"));
  app.on("will-quit", () => smokeDebug("app-will-quit"));
  app.on("quit", (_event, exitCode) => smokeDebug("app-quit", { exitCode }));
}
smokePhase("loaded");
const hasSingleInstance = smokeExitRequested || Boolean(process.env.LEE_SMOKE_STATUS_FILE) || app.requestSingleInstanceLock();
if (!hasSingleInstance) {
  smokePhase("lock-failed");
  app.quit();
} else {
  smokePhase("lock-acquired");
  if (!smokeExitRequested) app.on("second-instance", () => { window?.show(); window?.focus(); });
}
if (!smokeExitRequested) app.setAppUserModelId("com.lamontlabs.projectlee");

function setUpdateState(next: UpdateState): void {
  updateState = next;
  if (smokeUpdateResultFile) writeFileSync(smokeUpdateResultFile, JSON.stringify(updateState, null, 2), "utf8");
  window?.webContents.send("lee:update-state", updateState);
}

function finishSmokeUpdate(status: "not-available" | "error", message?: string): void {
  setUpdateState({ status, message });
  setTimeout(() => app.quit(), 100);
}

function interruptSmokeUpdate(phase: "download" | "install", version?: string): void {
  if (smokeInterruptionTriggered) return;
  smokeInterruptionTriggered = true;
  setUpdateState({ status: "interrupted", version, phase, message: `${phase}-interrupted` });
  if (smokeUpdateInterruptFile) writeFileSync(smokeUpdateInterruptFile, JSON.stringify({ status: "interrupted", phase, version }, null, 2), "utf8");
  if (phase === "download") {
    setTimeout(() => app.quit(), 100);
  } else {
    setTimeout(() => autoUpdater.quitAndInstall(), Math.max(0, smokeUpdateInterruptDelayMs));
  }
}

function waitForSmokeOwnerAuthentication(): void {
  if (!smokeOwnerAuthFile) { app.quit(); return; }
  const deadline = Date.now() + 30_000;
  const check = () => {
    if (existsSync(smokeOwnerAuthFile)) { app.quit(); return; }
    if (Date.now() >= deadline) { console.error("Timed out waiting for packaged owner authentication smoke confirmation."); app.exit(1); return; }
    setTimeout(check, 50);
  };
  check();
}

function registerIpcHandlers(): void {
  if (ipcHandlersRegistered) return;
  ipcHandlersRegistered = true;
  ipcMain.handle("lee:runtime-status", () => supervisor.status);
  ipcMain.handle("lee:runtime-restart", async () => {
    await supervisor.stop();
    return supervisor.start();
  });
  ipcMain.handle("lee:discover-local-services", () => supervisor.discoverLocalServices());
  ipcMain.handle("lee:update-status", () => updateState);
  ipcMain.handle("lee:update-check", () => checkForUpdates());
  ipcMain.handle("lee:update-download", async () => { if (updateState.status === "available") await autoUpdater.downloadUpdate(); return updateState; });
  ipcMain.handle("lee:update-install", () => { if (updateState.status === "downloaded") autoUpdater.quitAndInstall(); return updateState; });
}

async function configureUpdates(): Promise<void> {
  if (!isProduction) { setUpdateState({ status: "unsupported", message: "Updates are available in packaged builds." }); return; }
  ({ autoUpdater } = await import("electron-updater"));
  smokePhase("updater-ready");
  if (smokeUpdateFeedUrl) autoUpdater.setFeedURL({ provider: "generic", url: smokeUpdateFeedUrl });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.on("checking-for-update", () => setUpdateState({ status: "checking" }));
  autoUpdater.on("update-available", (info) => {
    setUpdateState({ status: "available", version: info.version });
    if (smokeUpdateFeedUrl) void autoUpdater.downloadUpdate();
  });
  autoUpdater.on("update-not-available", () => smokeUpdateFeedUrl ? finishSmokeUpdate("not-available") : setUpdateState({ status: "not-available" }));
  autoUpdater.on("download-progress", (progress) => {
    if (smokeUpdateInterrupt === "download" && progress.percent > 0) {
      interruptSmokeUpdate("download", smokeUpdateExpectedVersion);
      return;
    }
    setUpdateState({ status: "downloading", message: `${Math.round(progress.percent)}% downloaded` });
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (smokeUpdateInterrupt === "install") {
      interruptSmokeUpdate("install", info.version);
      return;
    }
    setUpdateState({ status: "downloaded", version: info.version });
    if (smokeUpdateInstall) setTimeout(() => autoUpdater.quitAndInstall(), 100);
  });
  autoUpdater.on("error", (error) => {
    if (smokeInterruptionTriggered) return;
    if (smokeUpdateFeedUrl) finishSmokeUpdate("error", error.message);
    else setUpdateState({ status: "error", message: error.message });
  });
  if (!(smokeUpdateFeedUrl && smokeUpdateExpectedVersion === app.getVersion())) {
    setTimeout(() => { void checkForUpdates(); }, smokeUpdateFeedUrl ? 1_000 : 10_000);
  }
}

async function checkForUpdates(): Promise<UpdateState> {
  if (!isProduction) return updateState;
  setUpdateState({ status: "checking" });
  try { await autoUpdater.checkForUpdates(); } catch (error) { setUpdateState({ status: "error", message: error instanceof Error ? error.message : "Update check failed." }); }
  return updateState;
}

function setupWindow(): BrowserWindow {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: "Project LEE",
    icon: join(app.getAppPath(), "resources", "lee.png"),
    webPreferences: { preload: join(app.getAppPath(), "dist", "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  window.on("close", (event) => {
    if (!isQuitting) { event.preventDefault(); window?.hide(); }
  });
  return window;
}

async function writeSmokeDiscovery(filePath: string): Promise<void> {
  const browserWindow = window;
  if (!browserWindow) throw new Error("LEE smoke discovery requires a BrowserWindow.");
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("LEE smoke discovery renderer did not become ready."));
    }, 15000);
    const cleanup = () => {
      clearTimeout(timeout);
      browserWindow.webContents.removeListener("did-finish-load", onLoad);
      browserWindow.webContents.removeListener("did-fail-load", onFail);
    };
    const onFail = (_event: Electron.Event, errorCode: number, errorDescription: string) => {
      cleanup();
      reject(new Error(`LEE smoke discovery renderer failed to load (${errorCode}: ${errorDescription}).`));
    };
    const onLoad = () => {
      void browserWindow.webContents.executeJavaScript("window.leeRuntime.discoverLocalServices()", true)
        .then((discovery) => {
          cleanup();
          writeFileSync(filePath, JSON.stringify(discovery, null, 2), "utf8");
          resolve();
        })
        .catch((error: unknown) => {
          cleanup();
          reject(error);
        });
    };
    browserWindow.webContents.once("did-finish-load", onLoad);
    browserWindow.webContents.once("did-fail-load", onFail);
  });
}

async function boot(): Promise<void> {
  smokePhase("boot");
  supervisor = new RuntimeSupervisor(app.getAppPath(), isProduction);
  const runtime = await supervisor.start();
  if (process.env.LEE_SMOKE_STATUS_FILE) {
    writeFileSync(process.env.LEE_SMOKE_STATUS_FILE, JSON.stringify({ version: app.getVersion(), ...runtime }, null, 2), "utf8");
  }
  if (smokeHeadless && process.env.LEE_SMOKE_STATUS_FILE) {
    if (smokeDiscoveryFile) {
      const discovery = await supervisor.discoverLocalServices();
      writeFileSync(smokeDiscoveryFile, JSON.stringify(discovery, null, 2), "utf8");
    }
    smokePhase("headless-ready");
    const statusFile = process.env.LEE_SMOKE_STATUS_FILE;
    const exitWatcher = setInterval(() => {
      if (!existsSync(statusFile)) {
        clearInterval(exitWatcher);
        void supervisor.stop().finally(() => app.exit(0));
      }
    }, 250);
    return;
  }
  const awaitingSmokeUpdate = Boolean(
    smokeUpdateFeedUrl &&
    smokeUpdateExpectedVersion &&
    app.getVersion() !== smokeUpdateExpectedVersion,
  );
  if (smokeExitRequested && !awaitingSmokeUpdate && !smokeOwnerAuthFile && !smokeDiscoveryFile) {
    await supervisor.stop();
    process.exit(0);
    return;
  }
  let consoleUrl: string;
  if (isProduction) {
    consoleServer = await startConsoleServer(join(process.resourcesPath, "console"), runtime.apiUrl);
    consoleUrl = `${consoleServer.url}/connections?desktop=1`;
  } else {
    const url = process.env.LEE_CONSOLE_URL ?? "http://127.0.0.1:5173/";
    consoleUrl = `${url}${url.includes("?") ? "&" : "?"}desktop=1`;
  }
  const browserWindow = setupWindow();
  if (smokeDiscoveryFile) {
    const discovery = writeSmokeDiscovery(smokeDiscoveryFile);
    await browserWindow.loadURL(consoleUrl);
    await discovery;
  } else {
    await browserWindow.loadURL(consoleUrl);
  }
  if (smokeUpdateFeedUrl && smokeUpdateExpectedVersion && app.getVersion() === smokeUpdateExpectedVersion) {
    if (smokeUpdateResultFile) writeFileSync(smokeUpdateResultFile, JSON.stringify({ status: "installed", version: app.getVersion() }, null, 2), "utf8");
  }
  if (smokeExitRequested && !awaitingSmokeUpdate) {
    if (smokeOwnerAuthFile) {
      waitForSmokeOwnerAuthentication();
    } else if (smokeDiscoveryFile) {
      await supervisor.stop();
      process.exit(0);
      return;
    }
  }
}

app.on("before-quit", (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    if (!supervisor) {
      app.exit(0);
      return;
    }
    void supervisor?.stop().finally(() => { consoleServer?.server.close(); app.quit(); });
  }
});
async function startReadyPath(): Promise<void> {
  smokePhase("ready");
  smokeDebug("ready-path-entered", { hasSingleInstance });
  if (!hasSingleInstance) {
    app.exit(0);
    return;
  }
  smokePhase("lock-ready");
  smokeDebug("tray-before");
  const icon = nativeImage.createFromPath(join(app.getAppPath(), "resources", "lee.ico"));
  tray = new Tray(icon);
  smokeDebug("tray-created");
  tray.setToolTip("Project LEE");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open LEE", click: () => window?.show() },
    { label: "Open data folder", click: () => shell.openPath(join(process.env.APPDATA ?? app.getPath("appData"), "Project LEE")) },
    { type: "separator" },
    { label: "Exit LEE", click: () => app.quit() },
  ]));
  tray.on("double-click", () => window?.show());
  registerIpcHandlers();
  if ((!smokeExitRequested && !process.env.LEE_SMOKE_STATUS_FILE) || smokeUpdateFeedUrl) await configureUpdates();
  await boot();
}

if ((smokeExitRequested && !smokeUpdateFeedUrl && !smokeOwnerAuthFile && !smokeDiscoveryFile) || smokeHeadless) {
  smokePhase("direct-boot");
  registerIpcHandlers();
  void boot();
} else {
  const readyWatchdog = smokeDebugFile ? setTimeout(() => smokeDebug("when-ready-pending"), 10_000) : null;
  void app.whenReady()
    .then(() => {
      if (readyWatchdog) clearTimeout(readyWatchdog);
      smokeDebug("when-ready-resolved");
      return startReadyPath();
    })
    .catch((error: unknown) => {
      if (readyWatchdog) clearTimeout(readyWatchdog);
      smokeDebug("when-ready-rejected", { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      app.exit(1);
    });
}
app.on("window-all-closed", () => { /* Tray keeps LEE alive until the user chooses Exit LEE. */ });