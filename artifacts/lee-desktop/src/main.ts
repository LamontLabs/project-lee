import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } from "electron";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { RuntimeSupervisor } from "./runtime.js";
import { startConsoleServer } from "./static-server.js";

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let supervisor: RuntimeSupervisor;
let consoleServer: Awaited<ReturnType<typeof startConsoleServer>> | null = null;
let isQuitting = false;

const isProduction = app.isPackaged;

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

async function boot(): Promise<void> {
  supervisor = new RuntimeSupervisor(app.getAppPath(), isProduction);
  const runtime = await supervisor.start();
  if (process.env.LEE_SMOKE_STATUS_FILE) {
    writeFileSync(process.env.LEE_SMOKE_STATUS_FILE, JSON.stringify(runtime, null, 2), "utf8");
  }
  if (isProduction) {
    consoleServer = await startConsoleServer(join(process.resourcesPath, "console"), runtime.apiUrl);
    setupWindow(consoleServer.url);
  } else {
    setupWindow(process.env.LEE_CONSOLE_URL ?? "http://127.0.0.1:5173/");
  }
  if (app.commandLine.hasSwitch("lee-smoke-exit")) app.quit();
}

app.on("before-quit", () => { isQuitting = true; supervisor?.stop(); consoleServer?.server.close(); });
app.whenReady().then(async () => {
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
  await boot();
});
app.on("window-all-closed", () => { /* Tray keeps LEE alive until the user chooses Exit LEE. */ });