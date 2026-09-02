import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { RuntimeSupervisor } from "./runtime.js";
import { startConsoleServer } from "./static-server.js";

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
let smokeInterruptionTriggered = false;
const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) app.quit();
else app.on("second-instance", () => { window?.show(); window?.focus(); });
app.setAppUserModelId("com.lamontlabs.projectlee");

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

function configureUpdates(): void {
  if (!isProduction) { setUpdateState({ status: "unsupported", message: "Updates are available in packaged builds." }); return; }
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

function setupWindow(url: string): void {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: "Project LEE",
    icon: join(app.getAppPath(), "resources", "lee.png"),
    webPreferences: { preload: join(app.getAppPath(), "dist", "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  void window.loadURL(url);
  window.on("close", (event) => {
    if (!isQuitting) { event.preventDefault(); window?.hide(); }
  });
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
  supervisor = new RuntimeSupervisor(app.getAppPath(), isProduction);
  const runtime = await supervisor.start();
  if (process.env.LEE_SMOKE_STATUS_FILE) {
    writeFileSync(process.env.LEE_SMOKE_STATUS_FILE, JSON.stringify({ version: app.getVersion(), ...runtime }, null, 2), "utf8");
  }
  if (isProduction) {
    consoleServer = await startConsoleServer(join(process.resourcesPath, "console"), runtime.apiUrl);
    setupWindow(`${consoleServer.url}/connections?desktop=1`);
  } else {
    const url = process.env.LEE_CONSOLE_URL ?? "http://127.0.0.1:5173/";
    setupWindow(`${url}${url.includes("?") ? "&" : "?"}desktop=1`);
  }
  if (process.env.LEE_SMOKE_DISCOVERY_FILE) {
    await writeSmokeDiscovery(process.env.LEE_SMOKE_DISCOVERY_FILE);
  }
  const awaitingSmokeUpdate = Boolean(
    smokeUpdateFeedUrl &&
    smokeUpdateExpectedVersion &&
    app.getVersion() !== smokeUpdateExpectedVersion,
  );
  if (smokeUpdateFeedUrl && smokeUpdateExpectedVersion && app.getVersion() === smokeUpdateExpectedVersion) {
    if (smokeUpdateResultFile) writeFileSync(smokeUpdateResultFile, JSON.stringify({ status: "installed", version: app.getVersion() }, null, 2), "utf8");
  }
  if (app.commandLine.hasSwitch("lee-smoke-exit") && !awaitingSmokeUpdate) app.quit();
}

app.on("before-quit", () => { isQuitting = true; supervisor?.stop(); consoleServer?.server.close(); });
app.whenReady().then(async () => {
  if (!hasSingleInstance) return;
  const icon = nativeImage.createFromPath(join(app.getAppPath(), "resources", "lee.ico"));
  tray = new Tray(icon);
  tray.setToolTip("Project LEE");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open LEE", click: () => window?.show() },
    { label: "Open data folder", click: () => shell.openPath(join(process.env.APPDATA ?? app.getPath("appData"), "Project LEE")) },
    { type: "separator" },
    { label: "Exit LEE", click: () => app.quit() },
  ]));
  tray.on("double-click", () => window?.show());
  ipcMain.handle("lee:runtime-status", () => supervisor.status);
  ipcMain.handle("lee:discover-local-services", () => supervisor.discoverLocalServices());
  ipcMain.handle("lee:update-status", () => updateState);
  ipcMain.handle("lee:update-check", () => checkForUpdates());
  ipcMain.handle("lee:update-download", async () => { if (updateState.status === "available") await autoUpdater.downloadUpdate(); return updateState; });
  ipcMain.handle("lee:update-install", () => { if (updateState.status === "downloaded") autoUpdater.quitAndInstall(); return updateState; });
  configureUpdates();
  await boot();
});
app.on("window-all-closed", () => { /* Tray keeps LEE alive until the user chooses Exit LEE. */ });