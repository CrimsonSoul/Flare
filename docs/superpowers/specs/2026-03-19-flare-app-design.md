# Flare — App Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Overview

Flare is a standalone Electron desktop app spun off from the Alerts tab of Relay. It is intended for use by teams outside the NOC who need to compose and distribute styled IT alert cards without requiring access to Relay. It shares Relay's visual design language but is a fully independent app with its own name, icon, data storage, and build artifacts.

---

## Approach

Fork the Relay project and strip everything except the alert tab. This is lower risk than scaffolding from scratch (the alert functionality already works) and avoids the complexity of a shared monorepo package. Design drift between Relay and Flare is acceptable — they serve different audiences and teams.

---

## What Gets Kept

**Renderer (UI):**

- `src/renderer/src/tabs/AlertsTab.tsx`
- `src/renderer/src/tabs/AlertForm.tsx`
- `src/renderer/src/tabs/AlertCard.tsx`
- `src/renderer/src/tabs/AlertHistoryModal.tsx`
- `src/renderer/src/tabs/alertUtils.tsx`
- `src/renderer/src/hooks/useAlertHistory.ts`
- Shared UI components: `TactileButton`, `CollapsibleHeader`, `Modal`, `Toast` (`ToastProvider` export), `ErrorBoundary`, `TabFallback`, `HistoryModal` (generic modal shell used by `AlertHistoryModal`), `ContextMenu` (used inside `HistoryModal`)
- Note: `AlertHistoryModal.tsx` (in `tabs/`) and `HistoryModal` (in `components/`) are two distinct files — both must be kept
- Full design system: `theme.css`, `components.css`, `animations.css`, `utilities.css`, `modals.css`, `responsive.css`, `app-icon.css`, `toast.css`, fonts

**Main process:**

- `src/main/operations/AlertHistoryOperations.ts`
- `src/main/handlers/featureHandlers.ts` — stripped to alert history CRUD only; remove Groups, Bridge History, Notes, and Saved Locations handler sections entirely
- `src/main/handlers/windowHandlers.ts` — keep clipboard image write, save PNG, company logo get/set/remove; remove aux window creation, `ALLOWED_AUX_ROUTES`, `createAuxWindow`
- `src/main/handlers/fileHandlers.ts` — keep `openExternal`, `openPath`; remove `importGroupsFromCsv` and the CSV import handler (which depends on the removed `csvUtils`)
- `src/main/handlers/loggerHandlers.ts` — keep in full (renderer log forwarding)
- `src/main/ipcHandlers.ts` — rewrite to register only: `setupWindowHandlers`, `setupFeatureHandlers` (alert history only), `setupFileHandlers` (trimmed), `setupLoggerHandlers`; remove all other `setup*` calls and their imports
- `src/main/app/appState.ts` — remove `handleDataPathChange`, `copyDataFilesAsync` import; keep `loadConfigAsync`, `ensureDataFilesAsync`, and the core bootstrap path
- `src/main/dataUtils.ts` — keep (provides `loadConfigAsync`/`ensureDataFilesAsync` used by `appState.ts`); remove `copyDataFilesAsync` — it is only called by `handleDataPathChange`, which is removed. `ensureDataFilesAsync` only creates the data directory (`mkdir`) — no CSV seeding, safe to keep verbatim
- Core infrastructure: `FileManager`, `fileLock`, `logger`, `env`, `securityPolicy`, `maintenanceTasks` (safe to keep verbatim — no references to removed data types), `rateLimiter`, `retryUtils`, `pathValidation`

**Preload:**

- Keep: `writeClipboardImage`, `writeClipboard`, `saveAlertImage`, `saveCompanyLogo`, `getCompanyLogo`, `removeCompanyLogo`, all alert history CRUD entries (`getAlertHistory`, `addAlertHistory`, `deleteAlertHistory`, `clearAlertHistory`, `pinAlertHistory`, `updateAlertHistoryLabel`), `logToMain`, `openExternal`, `openPath`, `platform`
- Strip all other bridge entries

---

## What Gets Removed

**Renderer:**

- All non-alert tabs: Compose/Assembler, Personnel, People, Servers, Radar, Weather, Notes, Status, CloudStatus and all their supporting files
- Components: `Sidebar`, `WorldClock`, `HeaderSearch`, `ShortcutsModal`, `AddContactModal`, `DataManagerModal`, `SettingsModal`, `PopoutBoard`, `ContactCard`, `ServerCard`, and all directory/personnel/oncall components
- Hooks: `useAppData`, `useAppWeather`, `useAppCloudStatus`, `useAppAssembler`, `useAssembler`, `useBridgeHistory`, `useDirectory`, `useDirectoryContacts`, `useDirectoryKeyboard`, `useGroups`, `useNotepad`, and all other hooks not used by the alert tab

**Main process:**

- `src/main/handlers/dataHandlers.ts`
- `src/main/handlers/dataRecordHandlers.ts`
- `src/main/handlers/weatherHandlers.ts`
- `src/main/handlers/cloudStatusHandlers.ts`
- `src/main/handlers/authHandlers.ts`
- `src/main/handlers/configHandlers.ts`
- `src/main/handlers/locationHandlers.ts`
- `src/main/csvUtils.ts`, `csvValidation.ts`, `csvTypes.ts`
- `src/main/DataCacheManager.ts`
- `src/main/FileWatcher.ts`, `FileEmitter.ts`
- `src/main/HeaderMatcher.ts`
- `src/main/credentialManager.ts`
- `src/main/dummyDataGenerator.ts`
- All `operations/` files except `AlertHistoryOperations.ts`

**Shared types (`src/shared/ipc.ts`):**

- Remove: `Contact`, `Server`, `OnCallRow`, `Group`, `TeamLayout`, `CloudStatus*`, `WeatherAlert`, `BridgeHistory*`, `SavedLocation`, `NotesData`, and all their IPC channels
- Keep: `AlertHistoryEntry`, `AlertHistoryEntrySchema`, `IpcResult`, `IPC_CHANNELS` (alert-related only)

**Resources:**

- `resources/contacts.csv`, `resources/groups.csv`

---

## Window & UI Layout

- **No sidebar** — removed entirely
- **No tab navigation** — no breadcrumb, no tab switching
- **Minimal title bar**: frameless (`titleBarStyle: 'hidden'`), window title `Flare`; macOS traffic lights at standard position
- **`AlertsTab` fills the full window** — the existing two-panel layout (left composer, right preview card) is unchanged
- **Window size**: `960×800` default, same min dimensions as Relay
- **`webviewTag`**: remove `webviewTag: true` from `BrowserWindow` options — it was only needed for RadarTab
- The `CollapsibleHeader` toolbar (RESET / HISTORY / PIN TEMPLATE / SAVE PNG / COPY FOR OUTLOOK) stays at the top of the view, unchanged

`App.tsx` becomes a minimal wrapper — no providers beyond `Toast` and `ErrorBoundary`:

```tsx
export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="app-container">
          <div className="window-controls-container">
            <WindowControls />
          </div>
          <AlertsTab />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
```

No new CSS classes are needed — `app-container` from Relay's existing stylesheet is sufficient. The sidebar flex-row layout assumption in that class will need a minor CSS adjustment to ensure `AlertsTab` fills the full content area without a sidebar column alongside it.

---

## Branding & Identity

| Field                  | Value                              |
| ---------------------- | ---------------------------------- |
| App name               | `Flare`                            |
| Product name           | `Flare`                            |
| App ID                 | `com.operators.flare`              |
| `package.json` name    | `flare`                            |
| Windows userData path  | `%APPDATA%/Flare`                  |
| Windows build artifact | `Flare.exe` (portable)             |
| Mac build artifacts    | `Flare-arm64.dmg`, `Flare-x64.dmg` |
| Window title           | `Flare`                            |

**Icon:** Warning triangle with an amber flame inside (replacing the exclamation mark). The icon pipeline already exists at `scripts/generate-icons.mjs` — it reads `build/icon.svg` and outputs `build/icon.png`, `build/icon.ico`, and `build/icon.icns`. Replace `build/icon.svg` with the new Flare SVG and run `node scripts/generate-icons.mjs` to regenerate all formats.

---

## Data Isolation

- On Windows, the portable userData override in `main/index.ts` is updated to `join(app.getPath('appData'), 'Flare')` — no other change needed on Windows.
- On macOS, Electron automatically resolves `userData` to `~/Library/Application Support/Flare` based on the product name — no code change required on Mac.
- Alert history (`alertHistory.json`) and company logo are stored in this userData directory — fully isolated from Relay's `%APPDATA%/Relay` / `~/Library/Application Support/Relay`.
- No shared state with Relay whatsoever.

---

## Files Changed Summary

| File                                   | Action                                                                                                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                         | Update `name` → `flare`, `productName` → `Flare`, update description                                                                                                                                                                |
| `electron-builder.yml`                 | Update `appId`, `productName`, artifact names; remove `extraResources` entries for `contacts.csv` and `groups.csv` (they are deleted resources and will cause a build failure if left in)                                           |
| `src/main/index.ts`                    | Update userData path to `'Flare'`; update error dialog text from `'Relay'` to `'Flare'`; remove `createAuxWindow`, aux window bootstrap path, and `ALLOWED_AUX_ROUTES` import; remove `webviewTag: true` from BrowserWindow options |
| `src/main/ipcHandlers.ts`              | Rewrite — keep only `setupWindowHandlers`, `setupFeatureHandlers`, `setupFileHandlers`, `setupLoggerHandlers`                                                                                                                       |
| `src/main/app/appState.ts`             | Remove `handleDataPathChange`, `copyDataFilesAsync` import; keep bootstrap path                                                                                                                                                     |
| `src/main/handlers/featureHandlers.ts` | Delete Groups, Bridge History, Notes, Saved Locations sections; keep alert history only                                                                                                                                             |
| `src/main/handlers/fileHandlers.ts`    | Remove `importGroupsFromCsv` handler and `csvUtils` import; keep `openExternal`, `openPath`                                                                                                                                         |
| `src/main/handlers/windowHandlers.ts`  | Remove `createAuxWindow`, `ALLOWED_AUX_ROUTES`; keep clipboard and alert image handlers                                                                                                                                             |
| `src/renderer/src/App.tsx`             | Replace with minimal single-view wrapper (see above)                                                                                                                                                                                |
| `src/shared/ipc.ts`                    | Strip all non-alert types and IPC channels (see details above)                                                                                                                                                                      |
| `src/preload/index.ts`                 | Strip all non-alert IPC bridge entries (see kept list above)                                                                                                                                                                        |
| `build/icon.*`                         | Replace with Flare warning-triangle-flame icon (SVG → PNG → .ico/.icns)                                                                                                                                                             |
| All other non-alert source files       | Delete                                                                                                                                                                                                                              |
