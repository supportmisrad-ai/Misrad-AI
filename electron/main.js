const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let nextServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/icon-512.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Load the app
  if (isDev) {
    // In development, connect to Next.js dev server
    mainWindow.loadURL('http://localhost:4000');
  } else {
    // In production, wait for server to start then load
    const checkServer = setInterval(() => {
      const http = require('http');
      const req = http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkServer);
          mainWindow.loadURL('http://localhost:3000');
        }
      });
      req.on('error', () => {
        // Server not ready yet
      });
    }, 500);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkServer);
      if (!mainWindow.webContents.getURL()) {
        mainWindow.loadURL('http://localhost:3000');
      }
    }, 30000);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) {
    // In dev, Next.js is already running
    return;
  }

  // In production, start Next.js server from standalone build
  const nextPath = path.join(__dirname, '../.next/standalone');
  const serverPath = path.join(nextPath, 'server.js');
  
  // Check if standalone build exists
  const fs = require('fs');
  if (!fs.existsSync(serverPath)) {
    console.error('Standalone build not found. Run "npm run build" first.');
    return;
  }
  
  nextServer = spawn('node', [serverPath], {
    cwd: nextPath,
    env: {
      ...process.env,
      PORT: '3000',
      NODE_ENV: 'production',
      HOSTNAME: 'localhost',
    },
    stdio: 'pipe',
  });

  nextServer.stdout.on('data', (data) => {
    console.log(`Next.js: ${data}`);
  });

  nextServer.stderr.on('data', (data) => {
    console.error(`Next.js: ${data}`);
  });

  nextServer.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });
}

app.whenReady().then(() => {
  startNextServer();
  
  // Wait a bit for server to start in production
  if (!isDev) {
    setTimeout(() => {
      createWindow();
    }, 2000);
  } else {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

// Handle external links
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});
