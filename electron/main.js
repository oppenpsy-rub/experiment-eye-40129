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

// Log build commit fingerprint if available (from bundled buildmeta.json)
function readBuildMeta() {
  try {
    const p = path.join(__dirname, 'dist', 'buildmeta.json');
    const s = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(s);
    return j;
  } catch {
    return null;
  }
}
try {
  const meta = readBuildMeta();
  const commit = (meta && meta.commit) || process.env.VITE_COMMIT_SHA || '(unknown)';
  log('[build] commit (electron):', commit);
} catch {}

// Loosen CORS/file restrictions for local file:// ESM modules and assets
try {
  app.commandLine.appendSwitch('allow-file-access-from-files');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
} catch {}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Forschungsdaten-Analyseplattform',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Relax security for local file:// scheme so ESM and asset loading work reliably
      // This app does not load remote content.
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
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
      window.addEventListener('error', (e) => {
        console.error('[renderer] window.error', e && e.message ? e.message : String(e));
      });
      window.addEventListener('unhandledrejection', (e) => {
        console.error('[renderer] unhandledrejection', e && e.reason ? (e.reason.message || String(e.reason)) : String(e));
      });
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

    // Re-check after a short delay to catch late mounts
    setTimeout(() => {
      const js2 = `(() => {
        const root = document.getElementById('root');
        const scripts = Array.from(document.scripts).map(s => s.src || '(inline)');
        const links = Array.from(document.querySelectorAll('link[rel="modulepreload"],link[rel="preload"],link[rel="stylesheet"]')).map(l => ({rel:l.rel, href:l.href}));
        console.log('[renderer] assets', { scripts, links });
        return { rootExists: !!root, rootChildren: root ? root.children.length : -1, scripts, links };
      })()`;
      win.webContents.executeJavaScript(js2).then((info2) => {
        log('[electron] boot-info-late:', info2);
      }).catch((err) => {
        log('[electron] executeJavaScript late error:', err && err.message ? err.message : String(err));
      });
    }, 1000);
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
