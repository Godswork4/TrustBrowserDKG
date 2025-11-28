const { contextBridge, shell, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => { try { shell.openExternal(url) } catch {} },
  openWindow: (url) => { try { ipcRenderer.send('open-window', url) } catch {} }
})