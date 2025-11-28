const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  const url = process.env.MAIN_URL || 'http://localhost:3001/'
  win.loadURL(url)
  win.webContents.on('did-fail-load', (e, ec, desc, validatedURL) => {
    try {
      console.error('Failed to load', ec, desc, validatedURL)
      setTimeout(() => win.loadURL(url), 800)
    } catch {}
  })

  // Ensure consistent zoom across devices (Windows DPI scaling can differ)
  win.webContents.on('did-finish-load', () => {
    try {
      win.webContents.setZoomFactor(1)
      win.webContents.setZoomLevel(0)
      win.webContents.setVisualZoomLevelLimits(1, 1)
      win.webContents.openDevTools({ mode: 'detach' })
    } catch (e) {}
  })
  ipcMain.on('open-window', (evt, targetUrl) => {
    try {
      const child = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: { webviewTag: false }
      })
      child.loadURL(String(targetUrl || ''))
    } catch {}
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})