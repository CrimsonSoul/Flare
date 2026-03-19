import { BrowserWindow } from 'electron';
import { setupWindowHandlers } from './handlers/windowHandlers';
import { setupFeatureHandlers } from './handlers/featureHandlers';
import { setupFileHandlers } from './handlers/fileHandlers';
import { loggers } from './logger';

export function setupIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
  getDataRoot: () => Promise<string>,
): void {
  loggers.main.info('Setting up IPC handlers');
  setupWindowHandlers(getMainWindow);
  setupFeatureHandlers(getDataRoot);
  setupFileHandlers(getDataRoot);
}
