import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("leeRuntime", {
  status: () => ipcRenderer.invoke("lee:runtime-status"),
});