/**
 * Feature Handlers - IPC handlers for alert history
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS, type AlertHistoryEntry } from '@shared/ipc';
import { AlertHistoryEntrySchema, validateIpcDataSafe } from '@shared/ipcValidation';
import {
  getAlertHistory,
  addAlertHistory,
  deleteAlertHistory,
  clearAlertHistory,
  pinAlertHistory,
  updateAlertHistoryLabel,
} from '../operations';
import { loggers } from '../logger';
import { checkMutationRateLimit, safeMutation } from './ipcHelpers';
import { getErrorMessage } from '@shared/types';

export function setupFeatureHandlers(getDataRoot: () => Promise<string>) {
  // ==================== Alert History ====================
  ipcMain.handle(IPC_CHANNELS.GET_ALERT_HISTORY, async () => {
    try {
      return await getAlertHistory(await getDataRoot());
    } catch (e) {
      loggers.ipc.error('GET_ALERT_HISTORY failed', {
        error: getErrorMessage(e),
      });
      return [];
    }
  });

  safeMutation(IPC_CHANNELS.ADD_ALERT_HISTORY, async (_, entry) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    const validatedEntry = validateIpcDataSafe(
      AlertHistoryEntrySchema,
      entry,
      'ADD_ALERT_HISTORY',
      (m, d) => loggers.ipc.warn(m, d),
    );
    if (!validatedEntry) {
      loggers.ipc.error('Invalid alert history entry data');
      return { success: false, error: 'Invalid entry data' };
    }
    const result = await addAlertHistory(
      await getDataRoot(),
      validatedEntry as Omit<AlertHistoryEntry, 'id' | 'timestamp'>,
    );
    return { success: !!result, data: result || undefined };
  });

  safeMutation(IPC_CHANNELS.DELETE_ALERT_HISTORY, async (_, id) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    if (typeof id !== 'string' || !id) {
      loggers.ipc.error('Invalid alert history ID parameter');
      return { success: false, error: 'Invalid ID' };
    }
    const success = await deleteAlertHistory(await getDataRoot(), id);
    return { success };
  });

  safeMutation(IPC_CHANNELS.CLEAR_ALERT_HISTORY, async () => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    const success = await clearAlertHistory(await getDataRoot());
    return { success };
  });

  safeMutation(IPC_CHANNELS.PIN_ALERT_HISTORY, async (_, id, pinned) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    if (typeof id !== 'string' || !id || typeof pinned !== 'boolean') {
      loggers.ipc.error('Invalid pin alert history parameters');
      return { success: false, error: 'Invalid parameters' };
    }
    const success = await pinAlertHistory(await getDataRoot(), id, pinned);
    return { success };
  });

  safeMutation(IPC_CHANNELS.UPDATE_ALERT_HISTORY_LABEL, async (_, id, label) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    if (typeof id !== 'string' || !id || typeof label !== 'string' || label.length > 10000) {
      loggers.ipc.error('Invalid update alert history label parameters');
      return { success: false, error: 'Invalid parameters' };
    }
    const success = await updateAlertHistoryLabel(await getDataRoot(), id, label);
    return { success };
  });
}
