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
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function showUpdateUI(type, version, percent = 0) {
  if (!win) return;

  const html = `
    (function() {
      let el = document.getElementById('update-overlay');
      if (!el) {
        el = document.createElement('div');
        el.id = 'update-overlay';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(el);
      }
      
      if ('${type}' === 'downloading') {
        el.innerHTML = \`
          <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:40px 50px;text-align:center;box-shadow:0 0 60px rgba(0,212,255,0.2);">
            <div style="font-size:28px;margin-bottom:8px;">⬇️</div>
            <div style="color:#00d4ff;font-size:18px;font-weight:600;margin-bottom:6px;">Downloading Update</div>
            <div style="color:#888;font-size:13px;margin-bottom:20px;">v${version}</div>
            <div style="width:280px;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
              <div id="update-progress-bar" style="height:100%;background:linear-gradient(90deg,#00d4ff,#00ff88);width:${percent}%;transition:width 0.3s ease;"></div>
            </div>
            <div id="update-progress-text" style="color:#00d4ff;font-size:14px;margin-top:12px;font-weight:500;">${percent}%</div>
          </div>
        \`;
      } else if ('${type}' === 'installing') {
        el.innerHTML = \`
          <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:40px 50px;text-align:center;box-shadow:0 0 60px rgba(0,212,255,0.2);">
            <div style="font-size:28px;margin-bottom:8px;">✨</div>
            <div style="color:#00d4ff;font-size:18px;font-weight:600;margin-bottom:6px;">Installing Update</div>
            <div style="color:#888;font-size:13px;">Restarting app...</div>
            <div style="margin-top:20px;">
              <div style="width:24px;height:24px;border:3px solid rgba(0,212,255,0.3);border-top-color:#00d4ff;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
            </div>
          </div>
          <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        \`;
      }
    })()
  `;
  win.webContents.executeJavaScript(html);
}

function updateProgressUI(percent) {
  if (!win) return;
  win.webContents.executeJavaScript(`
    const bar = document.getElementById('update-progress-bar');
    const text = document.getElementById('update-progress-text');
    if (bar) bar.style.width = '${percent}%';
    if (text) text.textContent = '${percent}%';
  `);
}

function hideUpdateUI() {
  if (!win) return;
  win.webContents.executeJavaScript(`
    const el = document.getElementById('update-overlay');
    if (el) el.remove();
  `);
}

let updateVersion = '';

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  updateVersion = info.version;
  showUpdateUI('downloading', info.version, 0);
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
});

autoUpdater.on('download-progress', (progress) => {
  const percent = Math.round(progress.percent);
  console.log(`Download progress: ${percent}%`);
  updateProgressUI(percent);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  showUpdateUI('installing', info.version);
  // Auto-install after short delay
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true);
  }, 1500);
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  hideProgress();
  dialog.showErrorBox('Update Error', `Auto-update failed: ${err.message}`);
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

function centerTop(width = 712, height = 600) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const x = Math.round((sw - width) / 2);
  const y = Math.round((sh - height) / 2);
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

  /* ---- Ctrl+Enter: Generate AI ---- */
  globalShortcut.register('CommandOrControl+Return', () => {
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
    console.log('Screen Capture Triggered');
    win.webContents.executeJavaScript(`
      if (window.captureScreen) { window.captureScreen(false); }
    `);
  });
  /* ---- Ctrl+S: Capture Screen + Save Context ---- */
  globalShortcut.register('CommandOrControl+S', () => {
    if (!win) return;
    console.log('Screen Capture Triggered (with context)');
    win.webContents.executeJavaScript(`
      if (window.captureScreen) { window.captureScreen(true); }
    `);
  });

  /* ---- Ctrl+Q: Toggle Mini Mode ---- */
  globalShortcut.register('CommandOrControl+Q', () => {
    if (!win) return;
    const [x, y] = win.getPosition();

    if (!isMiniMode) {
      // Switch to Mini Mode - small floating box
      win.setOpacity(1.0); // Fully opaque
      win.setBounds({ x, y, width: 28, height: 28 });
      win.webContents.executeJavaScript(`document.body.classList.add('mini');`);
      isMiniMode = true;
    } else {
      // Expand back
      win.setOpacity(0.95); // Restore slight transparency
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
  tray.setToolTip('Windows Command Controller');
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
    // Force kill the backend process and its children
    try {
      process.kill(backendProcess.pid, 'SIGTERM');
    } catch (e) {
      console.log('Backend already terminated');
    }
  }
});

// Also handle before-quit for extra safety
app.on('before-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    try {
      // On Windows, use taskkill to ensure process tree is killed
      if (process.platform === 'win32') {
        require('child_process').execSync(`taskkill /pid ${backendProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        backendProcess.kill('SIGKILL');
      }
    } catch (e) {
      console.log('Backend cleanup:', e.message);
    }
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
