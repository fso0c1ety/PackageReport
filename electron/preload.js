const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartManageSecureStorage', {
  getRefreshToken: () => ipcRenderer.invoke('secure-auth:get'),
  setRefreshToken: (value) => ipcRenderer.invoke('secure-auth:set', String(value || '')),
  clearRefreshToken: () => ipcRenderer.invoke('secure-auth:clear'),
});

contextBridge.exposeInMainWorld('smartManageUpdater', {
  version: process.versions.electron,
  check: () => ipcRenderer.invoke('smart-manage-updater:check'),
  download: () => ipcRenderer.invoke('smart-manage-updater:download'),
  install: () => ipcRenderer.invoke('smart-manage-updater:install'),
  getState: () => ipcRenderer.invoke('smart-manage-updater:state'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('smart-manage-updater:state', listener);
    return () => ipcRenderer.removeListener('smart-manage-updater:state', listener);
  },
});
