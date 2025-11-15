const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { app: expressApp } = require('./api/server');

const API_PORT = process.env.API_PORT || 3001;
let mainWindow;
let apiServer;

// Start Express API server
function startApiServer() {
  return new Promise((resolve, reject) => {
    apiServer = expressApp.listen(API_PORT, () => {
      console.log(`API server running on http://localhost:${API_PORT}`);
      resolve();
    }).on('error', (err) => {
      console.error('Failed to start API server:', err);
      reject(err);
    });
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 640,  // Allow smaller minimum width for better responsiveness
    minHeight: 480, // Allow smaller minimum height
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    await startApiServer();
    createWindow();
  } catch (err) {
    console.error('Failed to initialize app:', err);
    app.quit();
  }

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

app.on('before-quit', () => {
  if (apiServer) {
    apiServer.close();
  }
});

// IPC handlers
ipcMain.handle('get-api-url', () => {
  return `http://localhost:${API_PORT}`;
});
