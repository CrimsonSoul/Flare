export type IpcResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  rateLimited?: boolean;
};

// Alert History - log of past alert compositions
export type AlertHistoryEntry = {
  id: string;
  timestamp: number;
  severity: 'ISSUE' | 'MAINTENANCE' | 'INFO' | 'RESOLVED';
  subject: string;
  bodyHtml: string;
  sender: string;
  recipient: string;
  pinned?: boolean;
  label?: string;
};

export type LogEntry = {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  module: string;
  message: string;
  data?: unknown;
  timestamp?: string;
  errorContext?: import('./logging').ErrorContext;
};

export const IPC_CHANNELS = {
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_MAXIMIZE_CHANGE: 'window:maximizeChange',
  OPEN_PATH: 'fs:openPath',
  OPEN_EXTERNAL: 'shell:openExternal',
  LOG_BRIDGE: 'metrics:logBridge',
  LOG_TO_MAIN: 'logger:toMain',
  // Alert History
  GET_ALERT_HISTORY: 'alerthistory:get',
  ADD_ALERT_HISTORY: 'alerthistory:add',
  DELETE_ALERT_HISTORY: 'alerthistory:delete',
  CLEAR_ALERT_HISTORY: 'alerthistory:clear',
  PIN_ALERT_HISTORY: 'alerthistory:pin',
  UPDATE_ALERT_HISTORY_LABEL: 'alerthistory:updateLabel',
  // Clipboard
  CLIPBOARD_WRITE: 'clipboard:write',
  CLIPBOARD_WRITE_IMAGE: 'clipboard:writeImage',
  // Alerts
  SAVE_ALERT_IMAGE: 'alert:saveImage',
  SAVE_COMPANY_LOGO: 'alert:saveCompanyLogo',
  GET_COMPANY_LOGO: 'alert:getCompanyLogo',
  REMOVE_COMPANY_LOGO: 'alert:removeCompanyLogo',
  // Drag Sync (window broadcast)
  DRAG_STARTED: 'drag:started',
  DRAG_STOPPED: 'drag:stopped',
  // On-Call Alert Dismissal Sync (window broadcast)
  ONCALL_ALERT_DISMISSED: 'oncall:alertDismissed',
} as const;
