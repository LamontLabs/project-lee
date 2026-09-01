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
type UpdateState = { status: "unsupported" | "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error"; version?: string; message?: string };
let updateState: UpdateState = { status: "idle" };

const isProduction = app.isPackaged;
const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) app.quit();
else app.on("second-instance", () => { window?.show(); window?.focus(); });
app.setAppUserModelId("com.lamontlabs.projectlee");

function setUpdateState(next: UpdateState): void {
  updateState = next;
  window?.webContents.send("lee:update-state", updateState);
}

function configureUpdates(): void {
  if (!isProduction) { setUpdateState({ status: "unsupported", message: "Updates are available in packaged builds." }); return; }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => setUpdateState({ status: "checking" }));
  autoUpdater.on("update-available", (info) => setUpdateState({ status: "available", version: info.version }));
  autoUpdater.on("update-not-available", () => setUpdateState({ status: "not-available" }));
  autoUpdater.on("download-progress", (progress) => setUpdateState({ status: "downloading", message: `${Math.round(progress.percent)}% downloaded` }));
  autoUpdater.on("update-downloaded", (info) => setUpdateState({ status: "downloaded", version: info.version }));
  autoUpdater.on("error", (error) => setUpdateState({ status: "error", message: error.message }));
  setTimeout(() => { void checkForUpdates(); }, 10_000);
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
    writeFileSync(process.env.LEE_SMOKE_STATUS_FILE, JSON.stringify(runtime, null, 2), "utf8");
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
  if (app.commandLine.hasSwitch("lee-smoke-exit")) app.quit();
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