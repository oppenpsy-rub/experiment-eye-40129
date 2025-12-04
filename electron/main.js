const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Forschungsdaten-Analyseplattform',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = app.isPackaged
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, '..', 'dist', 'index.html');
  const fileUrl = url.pathToFileURL(indexPath).toString();

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    const message = `Failed to load: ${validatedURL}\nError ${errorCode}: ${errorDescription}`;
    console.error('[electron] did-fail-load:', message);
    // Show a minimal dialog so user isn't stuck on blank screen without feedback
    dialog.showErrorBox('Ladefehler', message);
  });

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  win.loadURL(fileUrl);
}

// Older Intel Macs can have GPU issues; allow disabling via env var
if (process.env.ELECTRON_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
