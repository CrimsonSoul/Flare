# Flare

Flare is an Electron desktop app for composing and tracking IT alerts — built for operations teams outside the NOC.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-0a7ea4) ![Shell](https://img.shields.io/badge/shell-Electron%2040-47848f) ![UI](https://img.shields.io/badge/ui-React%2019-149eca) ![Language](https://img.shields.io/badge/language-TypeScript%205.9-2ea043)

## Snapshot

- Compose structured IT alert cards with severity, affected systems, and impact details
- Capture alert cards as images for clipboard or file export
- Persistent alert history with local-first JSON storage
- Per-team company logo branding on alert cards
- Full quality workflow: linting, type checking, tests, and CI release packaging

## Core Features

- **Alert Composer** — Build alert cards with title, severity, affected systems, and message body
- **Alert History** — Browse, search, and replay past alerts
- **Image Export** — Capture alert cards as PNG for clipboard or save to disk
- **Company Logo** — Upload a logo that appears on every alert card

## Architecture

- `src/main/`: IPC handlers and alert history/file operations
- `src/preload/`: typed `window.FlareAPI` bridge via Electron context isolation
- `src/renderer/`: React alert UI and shared components
- `src/shared/`: IPC channel contracts and domain types

## Tech Stack

| Layer         | Technology                |
| ------------- | ------------------------- |
| Desktop shell | Electron 40               |
| Frontend      | React 19 + TypeScript 5.9 |
| Build         | Vite 7 + electron-vite 5  |
| Testing       | Vitest 4                  |

## Quick Start

```bash
npm install
npm run dev
```

## Quality and Testing

```bash
npm run typecheck      # TypeScript strict mode
npm run lint           # ESLint
npm test               # Vitest unit tests
```

## Security

- Context isolation and OS-level sandbox enabled on all renderer processes
- Renderer has no direct Node.js or Electron API access
- Strict CSP headers — no external network access from renderer
- Path traversal checks on all file system operations

## Project Layout

- `src/main/operations/`: alert history CRUD and file utilities
- `src/main/handlers/`: IPC handler registration and input validation
- `src/renderer/src/tabs/`: AlertsTab — the single app view
- `src/renderer/src/hooks/`: alert state and side-effect hooks

## License

MIT
