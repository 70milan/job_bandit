const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, screen, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let tray = null;
let win = null;
let isRecording = false;
let isMiniMode = false;

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
  createWindow();

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

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
