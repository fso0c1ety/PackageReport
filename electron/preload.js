const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartManageSecureStorage', {
  getRefreshToken: () => ipcRenderer.invoke('secure-auth:get'),
  setRefreshToken: (value) => ipcRenderer.invoke('secure-auth:set', String(value || '')),
  clearRefreshToken: () => ipcRenderer.invoke('secure-auth:clear'),
});
