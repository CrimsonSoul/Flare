import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { setupIpcHandlers } from '../ipcHandlers';
import { setupLoggerHandlers } from '../handlers/loggerHandlers';
import { ensureDataFilesAsync, loadConfigAsync } from '../dataUtils';
import { loggers } from '../logger';
import { getSecureOrigin, isTrustedGeolocationOrigin } from '../securityPolicy';

export interface AppState {
  mainWindow: BrowserWindow | null;
  currentDataRoot: string;
}

export const state: AppState = { mainWindow: null, currentDataRoot: '' };

export const getDefaultDataPath = () => join(app.getPath('userData'), 'data');
export const getBundledDataPath = () =>
  app.isPackaged ? join(process.resourcesPath, 'data') : join(process.cwd(), 'data');

/**
 * Cached promise for the data root resolution.
 * Once resolved, `state.currentDataRoot` is set and subsequent calls
 * return immediately without hitting disk.
 */
let dataRootPromise: Promise<string> | null = null;

/** Reset the cached data root promise (for testing). */
export function resetDataRootCache() {
  dataRootPromise = null;
}

/**
 * Returns the data root path. On the first call, resolves the path from
 * config (async), ensures directories exist, and caches the result in
 * `state.currentDataRoot`. Subsequent calls return the cached value
 * without any I/O.
 */
export async function getDataRoot(): Promise<string> {
  // Fast path: already resolved and cached
  if (state.currentDataRoot) return state.currentDataRoot;

  // Coalesce concurrent callers behind a single promise
  dataRootPromise ??= (async () => {
    try {
      const config = await loadConfigAsync();
      const root = config.dataRoot || getDefaultDataPath();
      await ensureDataFilesAsync(root);
      state.currentDataRoot = root;
      loggers.main.info('Data root resolved', { path: root });
      return root;
    } catch (error) {
      dataRootPromise = null;
      throw error;
    }
  })();

  return dataRootPromise;
}

export function setupIpc() {
  setupIpcHandlers(() => state.mainWindow, getDataRoot);
  setupLoggerHandlers();
}

export function setupPermissions(sess: Electron.Session) {
  sess.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const isMainWindow = state.mainWindow?.webContents === webContents;

    if (permission === 'geolocation') {
      const requestingOrigin = getSecureOrigin(details.requestingUrl);
      const allowed = !!isMainWindow || isTrustedGeolocationOrigin(requestingOrigin);
      if (!allowed) {
        loggers.security.warn('Blocked geolocation permission request from untrusted origin', {
          requestingUrl: details.requestingUrl,
        });
      }
      callback(allowed);
      return;
    }

    if (permission === 'media') {
      callback(!!isMainWindow);
      return;
    }

    callback(false);
  });

  sess.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const mainWindowWebContents = state.mainWindow?.webContents;
    const canCompareById =
      typeof mainWindowWebContents?.id === 'number' && typeof webContents.id === 'number';
    const isMainWindowById = canCompareById && mainWindowWebContents.id === webContents.id;
    const isMainWindow = isMainWindowById;
    const mainWindowOrigin = state.mainWindow
      ? getSecureOrigin(state.mainWindow.webContents.getURL())
      : null;
    const isMainWindowOrigin =
      mainWindowOrigin !== null && getSecureOrigin(requestingOrigin) === mainWindowOrigin;

    if (permission === 'geolocation') {
      return !!isMainWindow || isMainWindowOrigin || isTrustedGeolocationOrigin(requestingOrigin);
    }

    if (permission === 'media') {
      return !!isMainWindow;
    }

    return false;
  });
}
