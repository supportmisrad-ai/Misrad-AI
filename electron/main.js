const { app, BrowserWindow } = require('electron');
const path = require('path');
const PRODUCTION_URL = process.env.MISRAD_PRODUCTION_URL || 'https://misrad-ai.com/app';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0b1220',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../app/icon.ico'),
    title: 'MISRAD AI',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
  });

  mainWindow.setMenuBarVisibility(false);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load production URL only (Shell)
  mainWindow.loadURL(PRODUCTION_URL);

  const loadTimeout = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.webContents.isLoadingMainFrame()) return;

    const safeUrl = String(PRODUCTION_URL).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>MISRAD AI - זמן טעינה ארוך</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;margin:40px;background:#0b1220;color:#e5e7eb}a{color:#93c5fd}code{background:#111827;padding:2px 6px;border-radius:6px}</style>
      </head><body>
      <h1>זמן הטעינה ארוך מהצפוי</h1>
      <p>כתובת: <code>${safeUrl}</code></p>
      <p>אם יש בעיית רשת/חסימה, אפשר לפתוח בדפדפן:</p>
      <p><a href="${safeUrl}">פתיחה בדפדפן</a></p>
      </body></html>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }, 20000);

  mainWindow.webContents.once('did-finish-load', () => {
    clearTimeout(loadTimeout);
  });

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle('MISRAD AI');
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    clearTimeout(loadTimeout);
    const safeUrl = String(validatedURL || PRODUCTION_URL).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeDesc = String(errorDescription || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>MISRAD AI - שגיאת טעינה</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;margin:40px;background:#0b1220;color:#e5e7eb}a{color:#93c5fd}code{background:#111827;padding:2px 6px;border-radius:6px}</style>
      </head><body>
      <h1>לא ניתן לטעון את MISRAD AI</h1>
      <p>כתובת: <code>${safeUrl}</code></p>
      <p>שגיאה: <code>${errorCode}</code> <code>${safeDesc}</code></p>
      <p>בדקו חיבור לאינטרנט או שכתובת השרת תקינה.</p>
      <p><a href="${safeUrl}">פתיחה בדפדפן</a></p>
      </body></html>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>MISRAD AI - תקלה</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;margin:40px;background:#0b1220;color:#e5e7eb}code{background:#111827;padding:2px 6px;border-radius:6px}</style>
      </head><body>
      <h1>אירעה תקלה במנוע התצוגה</h1>
      <p>סיבה: <code>${String(details?.reason || '')}</code></p>
      <p>קוד יציאה: <code>${String(details?.exitCode ?? '')}</code></p>
      </body></html>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle external links
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
});
