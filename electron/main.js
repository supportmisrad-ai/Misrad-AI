const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const PRODUCTION_URL = process.env.MISRAD_PRODUCTION_URL || 'https://misrad-ai.com/app';

let mainWindow;

function normalizeUrl(value) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : null;
}

function resolvePlatformVersion(manifest, platform) {
  const m = manifest && typeof manifest === 'object' && !Array.isArray(manifest) ? manifest : null;
  if (!m) return null;

  const downloads = m.downloads && typeof m.downloads === 'object' && !Array.isArray(m.downloads) ? m.downloads : null;
  if (downloads) {
    const p = downloads[platform] && typeof downloads[platform] === 'object' && !Array.isArray(downloads[platform]) ? downloads[platform] : null;
    const v = normalizeUrl(p && p.version);
    if (v) return v;
  }

  const direct = m[platform] && typeof m[platform] === 'object' && !Array.isArray(m[platform]) ? m[platform] : null;
  const v2 = normalizeUrl(direct && direct.version);
  if (v2) return v2;

  const legacyKey = platform === 'windows' ? 'windowsVersion' : 'androidVersion';
  return normalizeUrl(m[legacyKey]);
}

function resolvePlatformDownloadUrl(manifest, platform) {
  const m = manifest && typeof manifest === 'object' && !Array.isArray(manifest) ? manifest : null;
  if (!m) return null;

  const downloads = m.downloads && typeof m.downloads === 'object' && !Array.isArray(m.downloads) ? m.downloads : null;
  if (downloads) {
    const p = downloads[platform] && typeof downloads[platform] === 'object' && !Array.isArray(downloads[platform]) ? downloads[platform] : null;
    const u = normalizeUrl(p && (p.url || p.downloadUrl));
    if (u) return u;
  }

  const direct = m[platform] && typeof m[platform] === 'object' && !Array.isArray(m[platform]) ? m[platform] : null;
  const u2 = normalizeUrl(direct && direct.url);
  if (u2) return u2;

  const legacyKey = platform === 'windows' ? 'windowsDownloadUrl' : 'androidDownloadUrl';
  return normalizeUrl(m[legacyKey]);
}

function compareLooseVersions(a, b) {
  const parse = (v) =>
    String(v || '')
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((p) => parseInt(p, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));

  const aa = parse(a);
  const bb = parse(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const proto = u.protocol === 'http:' ? http : https;
      const req = proto.get(u, (res) => {
        const status = Number(res.statusCode || 0);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            if (status < 200 || status >= 300) {
              return reject(new Error(`HTTP ${status}`));
            }
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

function downloadToFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const proto = u.protocol === 'http:' ? http : https;

      const req = proto.get(u, (res) => {
        const status = Number(res.statusCode || 0);
        const location = res.headers && res.headers.location ? String(res.headers.location) : '';

        if ([301, 302, 303, 307, 308].includes(status) && location) {
          res.resume();
          if (redirectCount >= 6) return reject(new Error('Too many redirects'));
          const next = new URL(location, u).toString();
          return resolve(downloadToFile(next, destPath, redirectCount + 1));
        }

        if (status !== 200) {
          res.resume();
          return reject(new Error(`Download failed (HTTP ${status})`));
        }

        const file = fs.createWriteStream(destPath);
        res.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve());
        });

        file.on('error', (err) => {
          try {
            file.close(() => {
              try {
                fs.unlink(destPath, () => reject(err));
              } catch {
                reject(err);
              }
            });
          } catch {
            reject(err);
          }
        });
      });

      req.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

async function checkForUpdatesWindows() {
  if (process.platform !== 'win32') return;

  let base;
  try {
    base = new URL(PRODUCTION_URL);
  } catch {
    return;
  }

  const apiUrl = new URL('/api/version', base.origin).toString();
  let payload;
  try {
    payload = await fetchJson(apiUrl);
  } catch {
    return;
  }

  const ok = payload && typeof payload === 'object' && payload.success === true;
  if (!ok) return;

  const manifest = payload.manifest;
  const latest = resolvePlatformVersion(manifest, 'windows');
  if (!latest) return;

  const current = app.getVersion();
  if (!current) return;

  if (compareLooseVersions(latest, current) <= 0) return;

  if (!mainWindow || mainWindow.isDestroyed()) return;

  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['הורדה והתקנה', 'אחר כך'],
    defaultId: 0,
    cancelId: 1,
    title: 'עדכון זמין',
    message: `זמינה גרסה חדשה: ${latest}`,
    detail: `גרסה נוכחית: ${current}`,
  });

  if (choice.response !== 0) return;

  const rawUrl =
    resolvePlatformDownloadUrl(manifest, 'windows') || new URL('/api/download/windows', base.origin).toString();

  let downloadUrl;
  try {
    downloadUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, base.origin).toString();
  } catch {
    downloadUrl = new URL('/api/download/windows', base.origin).toString();
  }

  const destPath = path.join(app.getPath('temp'), `MISRAD AI Setup ${latest}.exe`);

  try {
    await downloadToFile(downloadUrl, destPath);
  } catch (e) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      buttons: ['סגור'],
      defaultId: 0,
      title: 'הורדה נכשלה',
      message: 'לא הצלחתי להוריד את קובץ ההתקנה.',
      detail: e && e.message ? String(e.message) : '',
    });
    return;
  }

  try {
    const child = spawn(destPath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    app.quit();
  } catch (e) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      buttons: ['סגור'],
      defaultId: 0,
      title: 'התקנה נכשלה',
      message: 'הקובץ הורד, אבל לא הצלחתי להפעיל אותו.',
      detail: e && e.message ? String(e.message) : destPath,
    });
  }
}

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
    setTimeout(() => {
      checkForUpdatesWindows().catch(() => undefined);
    }, 2500);
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
