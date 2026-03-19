import { app, BrowserWindow, session, dialog, Menu } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loggers } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { validateEnv } from './env';
import { state, getDataRoot, setupIpc, setupPermissions } from './app/appState';
import { setupMaintenanceTasks } from './app/maintenanceTasks';
import { setupWindowListeners } from './handlers/windowHandlers';

// Ensure a consistent userData path for portable builds on Windows.
// Without this, portable .exe instances launched from different locations
// may resolve to different userData dirs and bypass the single-instance lock.
if (process.platform === 'win32') {
  const portableUserData = join(app.getPath('appData'), 'Flare');
  app.setPath('userData', portableUserData);
}

// Validate environment early
validateEnv();

const gotLock = app.requestSingleInstanceLock();
if (gotLock) {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore();
      state.mainWindow.focus();
    }
  });

  loggers.main.info('Startup Info:', {
    arch: process.arch,
    platform: process.platform,
    electron: process.versions.electron,
    node: process.versions.node,
  });

  // Windows-specific optimizations
  if (process.platform === 'win32') {
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
  }

  // App lifecycle
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  loggers.main.info('Waiting for Electron ready...');

  async function createWindow() {
    state.mainWindow = new BrowserWindow({
      width: 960,
      height: 800,
      minWidth: 400,
      minHeight: 600,
      center: true,
      backgroundColor: '#060608',
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 12, y: 12 },
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        spellcheck: true,
        ...(process.platform === 'win32' && {
          enableWebSQL: false,
        }),
      },
    });

    setupWindowListeners(state.mainWindow);

    // Configure spellchecker languages
    state.mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']);

    state.mainWindow.on('close', () => {
      // Close all other windows when the main window is closed
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win !== state.mainWindow) win.close();
      });
    });

    const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL !== undefined;

    // Set Content Security Policy
    // M5: 'unsafe-eval' in dev is intentional — only enabled when !app.isPackaged for HMR/dev tooling
    // M4: 'unsafe-inline' for style-src is an accepted risk — React and many UI libraries
    //     inject inline styles at runtime; removing it would break component rendering
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              `script-src 'self' ${isDev ? "'unsafe-eval' 'unsafe-inline'" : "'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='"}; ` +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "connect-src 'self'; " +
              "font-src 'self' data:; " +
              "frame-src 'none'; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          ],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'X-XSS-Protection': ['1; mode=block'],
          'Referrer-Policy': ['strict-origin-when-cross-origin'],
        },
      });
    });

    // Initialize data root before loading the renderer so IPC handlers
    // have a valid path when the renderer starts making requests.
    loggers.main.info('Starting data initialization...');
    try {
      state.currentDataRoot = await getDataRoot();
      loggers.main.info('Data root:', { path: state.currentDataRoot });
    } catch (error) {
      loggers.main.error('Failed to initialize data', { error });
    }

    state.mainWindow.once('ready-to-show', () => {
      state.mainWindow?.show();
      state.mainWindow?.focus();
      loggers.main.debug('ready-to-show fired');
    });

    if (isDev) {
      await state.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!);
    } else {
      const indexPath = join(__dirname, '../renderer/index.html');
      state.mainWindow.loadFile(indexPath).catch((err) => {
        loggers.main.error('Failed to load local index.html', {
          path: indexPath,
          error: err.message,
        });
        throw err;
      });
    }

    // Prevent the main window from navigating away (H-1: navigation hijacking defense)
    const allowedFilePath = join(__dirname, '../renderer/');
    state.mainWindow.webContents.on('will-navigate', (event, url) => {
      // Allow dev server and local file reloads
      if (isDev && url.startsWith(process.env.ELECTRON_RENDERER_URL!)) return;
      // Only allow file:// navigation within the app's renderer directory
      if (url.startsWith('file://')) {
        const decodedUrl = decodeURIComponent(url.replace('file://', ''));
        if (decodedUrl.startsWith(allowedFilePath)) return;
      }
      loggers.security.warn(`Blocked main window navigation to: ${url}`);
      event.preventDefault();
    });

    // Block window.open() from the renderer (H-1)
    state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      loggers.security.warn(`Blocked window.open() attempt: ${url}`);
      return { action: 'deny' };
    });

    // Context menu — spellcheck suggestions + Cut/Copy/Paste for editable fields
    state.mainWindow.webContents.on('context-menu', (_event, params) => {
      const menuItems: Electron.MenuItemConstructorOptions[] = [];

      // Spellcheck suggestions when a word is misspelled
      if (params.misspelledWord) {
        const suggestions = params.dictionarySuggestions.map((suggestion) => ({
          label: suggestion,
          click: () => state.mainWindow?.webContents.replaceMisspelling(suggestion),
        }));
        if (suggestions.length === 0) {
          menuItems.push({ label: 'No suggestions', enabled: false });
        } else {
          menuItems.push(...suggestions);
        }
        menuItems.push(
          { type: 'separator' },
          {
            label: 'Add to Dictionary',
            click: () =>
              state.mainWindow?.webContents.session.addWordToSpellCheckerDictionary(
                params.misspelledWord,
              ),
          },
          { type: 'separator' },
        );
      }

      // Standard editing actions for editable fields
      if (params.isEditable) {
        menuItems.push(
          { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
          { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
          { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
          { label: 'Select All', role: 'selectAll', enabled: params.editFlags.canSelectAll },
        );
      } else if (params.selectionText) {
        // Allow copying selected text in non-editable areas
        menuItems.push({ label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy });
      }

      if (menuItems.length > 0) {
        Menu.buildFromTemplate(menuItems).popup();
      }
    });

    state.mainWindow.on('closed', () => {
      state.mainWindow = null;
    });
  }

  const bootstrap = async () => {
    try {
      if (!app.isReady()) {
        await app.whenReady();
      }

      loggers.main.info('Electron ready, performing setup...');

      setupPermissions(session.defaultSession);

      setupIpc();
      await createWindow();
      const cleanupMaintenance = setupMaintenanceTasks();

      // Graceful shutdown: clean up timers, etc.
      app.on('before-quit', () => {
        loggers.main.info('App quitting — cleaning up resources');
        cleanupMaintenance();
      });

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow().catch((error_) => {
            loggers.main.error('Failed to create window on app activate', { error: error_ });
          });
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      loggers.main.error('Failed to start application', { error: errorMessage });
      dialog.showErrorBox('Critical Startup Error', errorMessage);
      app.quit();
    }
  };

  // Avoid top-level await — it deadlocks app.whenReady() in Electron ES modules
  // on certain macOS versions (confirmed on macOS 26). Use .catch() instead so
  // module evaluation completes synchronously and the event loop stays unblocked.
  bootstrap().catch((error_) => {
    loggers.main.error('Unexpected bootstrap failure', { error: error_ });
    app.quit();
  }); // NOSONAR: top-level await can deadlock Electron startup on some macOS versions.

  // Global Exception Handlers
  process.on('uncaughtException', (error) => {
    loggers.main.error('Uncaught Exception', { error: error.message, stack: error.stack });
    dialog.showErrorBox('Startup Error', `Flare encountered a critical error:\n\n${error.message}`);
    app.quit();
  });

  process.on('unhandledRejection', (reason: unknown) => {
    loggers.main.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
} else {
  app.quit();
}
