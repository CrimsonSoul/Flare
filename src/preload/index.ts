import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';

const api = {
  // Window controls
  windowMinimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_MAXIMIZE_CHANGE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_MAXIMIZE_CHANGE, handler);
  },
  // Clipboard
  writeClipboard: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, text),
  /** Accepts PNG data URLs only. This is intentional: clipboard operations use PNG format. */
  writeClipboardImage: (dataUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE_IMAGE, dataUrl),
  // Alerts
  saveAlertImage: (dataUrl: string, suggestedName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_ALERT_IMAGE, dataUrl, suggestedName),
  saveCompanyLogo: () => ipcRenderer.invoke(IPC_CHANNELS.SAVE_COMPANY_LOGO),
  getCompanyLogo: () => ipcRenderer.invoke(IPC_CHANNELS.GET_COMPANY_LOGO),
  removeCompanyLogo: () => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_COMPANY_LOGO),
  // Alert History
  getAlertHistory: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALERT_HISTORY),
  addAlertHistory: (entry: unknown) => ipcRenderer.invoke(IPC_CHANNELS.ADD_ALERT_HISTORY, entry),
  deleteAlertHistory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_ALERT_HISTORY, id),
  clearAlertHistory: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_ALERT_HISTORY),
  pinAlertHistory: (id: string, pinned: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.PIN_ALERT_HISTORY, id, pinned),
  updateAlertHistoryLabel: (id: string, label: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ALERT_HISTORY_LABEL, id, label),
  // Logging
  logToMain: (entry: unknown) => ipcRenderer.send(IPC_CHANNELS.LOG_TO_MAIN, entry),
  logBridge: (groups: string[]) => ipcRenderer.send(IPC_CHANNELS.LOG_BRIDGE, groups),
  // Shell
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
  /** Path validation and sandboxing constraints are enforced on the main process side. */
  openPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, path),
  // Platform
  platform: process.platform,
};

export type FlareAPI = typeof api;

contextBridge.exposeInMainWorld('api', api);
