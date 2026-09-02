import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("leeRuntime", {
  status: () => ipcRenderer.invoke("lee:runtime-status"),
  restartRuntime: () => ipcRenderer.invoke("lee:runtime-restart"),
  discoverLocalServices: () => ipcRenderer.invoke("lee:discover-local-services"),
  updateStatus: () => ipcRenderer.invoke("lee:update-status"),
  checkForUpdates: () => ipcRenderer.invoke("lee:update-check"),
  downloadUpdate: () => ipcRenderer.invoke("lee:update-download"),
  installUpdate: () => ipcRenderer.invoke("lee:update-install"),
  onUpdateState: (listener: (state: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown) => listener(state);
    ipcRenderer.on("lee:update-state", handler);
    return () => ipcRenderer.removeListener("lee:update-state", handler);
  },
});