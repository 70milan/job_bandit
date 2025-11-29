const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, screen, ipcMain, desktopCapturer, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

let tray = null;
let win = null;
let isRecording = false;
let isMiniMode = false;
let backendProcess = null;

// ============ AUTO-UPDATER SETUP ============
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Download now?`,
    buttons: ['Download', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`Download progress: ${Math.round(progress.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded. Restart now to install?`,
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});
// ============ END AUTO-UPDATER ============

function startBackend() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    console.log('Development mode: assuming backend runs separately');
    return;
  }

  const backendPath = path.join(process.resourcesPath, 'backend', 'interview-backend.exe');
  console.log('Starting backend from:', backendPath);
  
  backendProcess = spawn(backendPath, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    windowsHide: false
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[BACKEND] ${data.toString()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[BACKEND ERROR] ${data.toString()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

function centerTop(width = 800, height = 600) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const x = Math.round((sw - width) / 2);
  const y = 0;
  return { x, y, width, height };
}

function createWindow() {
  const bounds = centerTop();
  win = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#1e1e1eAA',
    opacity: 0.95,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // Keep running in background
    },
  });

  // STEALTH MODE: Hide from screen capture
  win.setContentProtection(true);

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  // Start backend first
  startBackend();
  
  // Wait for backend to initialize
  setTimeout(() => {
    createWindow();
    
    // Check for updates after window is created (only in production)
    if (app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 3000);
    }
  }, 2000);

  // IPC Handler for Screen Sources (Workaround for renderer restriction)
  ipcMain.handle('GET_SOURCES', async (event, types) => {
    const sources = await desktopCapturer.getSources({ types });
    // Return only necessary data to avoid serialization issues with NativeImage
    return sources.map(s => ({
      id: s.id,
      name: s.name
    }));
  });

  /* ---- Ctrl+F: Maximize AI Response Window ---- */
  globalShortcut.register('CommandOrControl+F', () => {
    if (!win) return;
    console.log('🔍 Maximize Response Triggered');
    win.webContents.executeJavaScript(`
      if (window.maximizeResponse) { window.maximizeResponse(); }
    `);
  });

  /* ---- move left / right ---- */
  globalShortcut.register('CommandOrControl+Alt+Left', () => {
    if (!win) return;
    const [x, y] = win.getPosition();
    win.setPosition(x - 50, y);
  });

  globalShortcut.register('CommandOrControl+Alt+Right', () => {
    if (!win) return;
    const [x, y] = win.getPosition();
    win.setPosition(x + 50, y);
  });

  /* ---- move up / down ---- */
  globalShortcut.register('CommandOrControl+Alt+Up', () => {
    if (!win) return;
    const [x, y] = win.getPosition();
    win.setPosition(x, y - 50);
  });

  globalShortcut.register('CommandOrControl+Alt+Down', () => {
    if (!win) return;
    const [x, y] = win.getPosition();
    win.setPosition(x, y + 50);
  });

  globalShortcut.register('CommandOrControl+R', () => {
    if (!win) return;
    console.log('🖥️ System Audio Capture Triggered');
    win.webContents.executeJavaScript(`
      if (window.toggleSystemCapture) { window.toggleSystemCapture(); }
    `);
  });

  /* ---- Ctrl+G: Generate AI ---- */
  globalShortcut.register('CommandOrControl+G', () => {
    if (!win) return;
    console.log('🤖 Generate AI Triggered');
    win.webContents.executeJavaScript(`
      if (window.generateAIOnly) { window.generateAIOnly(); }
    `);
  });

  /* ---- Ctrl+M: Toggle Mic Capture ---- */
  globalShortcut.register('CommandOrControl+M', () => {
    if (!win) return;
    console.log('🎤 Mic Capture Triggered');
    win.webContents.executeJavaScript(`
      if (window.toggleMicCapture) { window.toggleMicCapture(); }
    `);
  });

  /* ---- Ctrl+K: Capture Screen ---- */
  globalShortcut.register('CommandOrControl+K', () => {
    if (!win) return;
    console.log('📸 Screen Capture Triggered');
    win.webContents.executeJavaScript(`
      if (window.captureScreen) { window.captureScreen(); }
    `);
  });

  /* ---- Ctrl+Q: Toggle Mini Mode ---- */
  globalShortcut.register('CommandOrControl+Q', () => {
    if (!win) return;
    const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
    const [x, y] = win.getPosition();

    if (!isMiniMode) {
      // Switch to Mini Mode
      win.setBounds({ x, y, width: 60, height: 60 });
      win.webContents.executeJavaScript(`document.body.classList.add('mini');`);
      isMiniMode = true;
    } else {
      // Expand back
      const bounds = centerTop(800, 600);
      win.setBounds(bounds);
      win.webContents.executeJavaScript(`document.body.classList.remove('mini');`);
      isMiniMode = false;
    }
  });

  /* ---- Ctrl+Shift+Q: Quit App ---- */
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });

  /* ---- Ctrl+Backspace: Clear Transcript ---- */
  globalShortcut.register('CommandOrControl+Backspace', () => {
    if (!win) return;
    console.log('🧹 Clear Transcript Triggered');
    win.webContents.executeJavaScript(`
      if (window.clearTranscript) { window.clearTranscript(); }
    `);
  });

  /* ---- Ctrl+Shift++: Incrementally Expand Window ---- */
  globalShortcut.register('CommandOrControl+Shift+Plus', () => {
    if (!win) return;
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    const newWidth = Math.min(width + 100, 1600);
    const newHeight = Math.min(height + 75, 1000);
    win.setBounds({ x: x - 50, y, width: newWidth, height: newHeight });
  });

  /* ---- Ctrl+Shift+-: Incrementally Contract Window ---- */
  globalShortcut.register('CommandOrControl+Shift+-', () => {
    if (!win) return;
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    const newWidth = Math.max(width - 100, 400);
    const newHeight = Math.max(height - 75, 300);
    win.setBounds({ x: x + 50, y, width: newWidth, height: newHeight });
  });

  /* ---- Ctrl+Shift+O: Reset to Default Size ---- */
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    if (!win) return;
    const bounds = centerTop(800, 600);
    win.setBounds(bounds);
    console.log('🔄 Window reset to default size');
  });

  /* ---- Tray ---- */
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(nativeImage.createFromPath(iconPath));
  tray.setToolTip('JobAndit');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show / Hide', click: () => (win.isVisible() ? win.hide() : win.show()) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => (win.isVisible() ? win.hide() : win.show()));


  /* ---- IPC: Close App ---- */
  ipcMain.on('close-app', () => {
    app.quit();
  });

  if (app.dock) app.dock.hide();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (backendProcess) {
    backendProcess.kill();
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
