const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

function createLogger() {
  let logFile;
  try {
    const userData = app.getPath('userData');
    logFile = path.join(userData, 'electron.log');
  } catch {}
  return function log(...args) {
    const msg = args
      .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
      .join(' ');
    try {
      console.log(msg);
    } catch {}
    if (logFile) {
      try {
        fs.appendFileSync(logFile, msg + '\n');
      } catch {}
    }
  };
}
const log = createLogger();

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
    log('[electron] did-fail-load:', message);
    dialog.showErrorBox('Ladefehler', message);
  });

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('did-finish-load', () => {
    log('[electron] did-finish-load:', fileUrl);
    // Inspect renderer DOM to diagnose blank screen without relying on DevTools
    const js = `(() => {
      const root = document.getElementById('root');
      const info = {
        title: document.title,
        bodyChildren: document.body ? document.body.children.length : -1,
        rootExists: !!root,
        rootChildren: root ? root.children.length : -1,
        bodyHTMLPreview: document.body ? document.body.innerHTML.slice(0, 300) : ''
      };
      console.log('[renderer] boot-info', info);
      return info;
    })()`;
    win.webContents.executeJavaScript(js).then((info) => {
      try { log('[electron] boot-info:', info); } catch {}
    }).catch((err) => {
      log('[electron] executeJavaScript error:', err && err.message ? err.message : String(err));
    });
  });

  win.on('unresponsive', () => {
    log('[electron] window unresponsive');
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    log('[electron] render-process-gone:', details);
  });

  if (process.env.OPEN_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

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
