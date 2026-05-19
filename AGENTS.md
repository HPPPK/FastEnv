# EnvGuard / ConfigureQuick Agent Notes

## Project Identity

This repository is an Electron desktop app named `env-guard`.

- Desktop shell: Electron 30
- Renderer: React 18 + TypeScript + Vite
- State: Zustand
- Styles: TailwindCSS
- Icons: lucide-react
- Main-process service layer: Node.js + TypeScript
- Package manager: pnpm through Corepack

This is not a browser plugin. It is a desktop app with an Electron main process, preload IPC bridge, and React renderer.

## Current Environment Notes

On this machine, default shell PATH may not include Node or pnpm. Use:

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH
```

Recommended commands:

```bash
cd /Users/panjingyu/Desktop/Project/ConfigureQuick
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run dev
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run build
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run type-check
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run lint
```

Important: this environment has `ELECTRON_RUN_AS_NODE=1` set globally. Electron must be started with it unset. `package.json` scripts already handle this:

```bash
env -u ELECTRON_RUN_AS_NODE NODE_ENV=development electron .
```

## Run Status

Latest verified dev startup:

```text
VITE v5.4.21 ready at http://localhost:5173/
[IPC] Setup completed
```

Expected warnings that can be ignored for now:

- Vite CJS Node API deprecation warning.
- Tailwind config warning from loading `tailwind.config.ts` while package type is CommonJS.
- Electron DevTools `Autofill.enable` protocol warning.

## Major Fixes Already Applied

- Replaced incompatible `vite-plugin-react` usage with official `@vitejs/plugin-react@4.7.0`.
- Updated `vite.config.ts` to use `react()`.
- Changed package type to `commonjs` so Electron main process can run compiled CommonJS output.
- Updated `tsconfig.electron.json` to compile Electron code as CommonJS with Node module resolution.
- Converted `postcss.config.js` to CommonJS.
- Fixed Electron dev scripts to unset `ELECTRON_RUN_AS_NODE` and set `NODE_ENV=development`.
- Fixed production renderer path in `electron/main/window.ts`.
- Added `src/vite-env.d.ts` for Vite asset/CSS import typing.
- Added IPC envelope types: `IPCRequest`, `IPCResponse`, `IPCEvent`.
- Relaxed and aligned app-wide TS types so existing service code compiles.
- Restored `service/env-scan/system-scanner.ts`, which had become empty.
- Added `src/api/envguard.ts` as renderer API wrapper for IPC calls.
- Wired basic IPC routes in `electron/ipc/setup.ts`.
- Added missing pages:
  - `src/pages/DependencyInstall.tsx`
  - `src/pages/RepairRecords.tsx`
  - `src/pages/Help.tsx`
- Fixed sidebar menu routing for dependency management, repair records, and help.
- New environment page now calls demand parsing and environment creation APIs.
- Added `service/system-fix/system-fixer.ts` skeleton.
- Added docs:
  - `docs/ipc-api.md`
  - `docs/acceptance-status.md`

## Implemented IPC Channels

Renderer should call `src/api/envguard.ts`, not use `window.ipcRenderer` directly.

Current main-process handlers:

- `system:scan`
- `env:list`
- `env:create`
- `env:delete`
- `demand:parse`
- `conflict:detect`
- `conflict:fix`
- `repair-records:list`
- `config:get`
- `config:set`
- `log:get` placeholder

## Current Project Structure Highlights

```text
electron/
  main/
  preload/
  ipc/
src/
  api/
  components/
  pages/
  store/
  types/
  utils/
service/
  demand-parse/
  env-conflict/
  env-create/
  env-install/
  env-scan/
  logger/
  storage/
  system-fix/
config/
scripts/
docs/
```

## Honest Completion Status

The project is not complete against the user's full enterprise specification.

### ✅ Baseline Now Works

- TypeScript type-check passes.
- Electron main compile passes.
- Vite build passes.
- ESLint quiet mode passes.
- Dev app starts as Electron desktop app.
- Basic IPC bridge is functional.
- Basic environment scan, environment persistence, demand parsing, conflict detection, and repair record listing are wired.
- **NEW**: Home page with environment list caching (5-minute TTL) and manual refresh.
- **NEW**: Environment detail page with cached data and tab navigation.
- **NEW**: System scanner now automatically scans environment dependencies (Python pip, Node npm).
- **NEW**: Environment cards display real dependency counts.

### 🔄 Recent Improvements (Latest Session)

1. **Home Page Caching & Refresh**
   - Added 5-minute cache expiry mechanism
   - Manual refresh button with loading state
   - Last refresh timestamp display
   - Search/filter support for environments

2. **Environment Detail Page**
   - Cached data prevents reload on navigation
   - Tab-based UI: Config, Dependencies, Tutorial, History
   - Manual refresh functionality
   - Dependency list display with version info

3. **System Scanner Enhancement**
   - Auto-scans Python dependencies via `pip list --format=json`
   - Auto-scans Node dependencies via `npm list --depth=0 --json`
   - Cross-platform path handling (Windows/Mac/Linux)
   - Graceful error handling with fallback to empty list
   - Limits display to first 10 dependencies per environment

### ⚠️ Still Missing or Incomplete

- Real shadcn/ui component library is not installed or generated.
- Dependency installation UI exists, but install/progress IPC is not wired end to end.
- Conflict repair is conservative/skeletal and does not yet safely mutate system PATH or global env vars.
- Full backup replay and rollback semantics are not production-grade.
- OCR/image parsing UI is not actually integrated; screenshot mode currently handles text-like uploads only.
- Auto-update, startup integration, context menu integration, and polished installer UX are not implemented.
- System permission prompts and second-confirmation flows need hardening.
- No automated tests or pressure/stress validation exist.
- Environment creation flow UI not fully wired to backend.
- Dependency installation progress visualization not connected to real install events.
- New build environment page needs backend service integration.
- Conflict detection and repair services need full implementation.
- Global settings page needs backend service integration.
- Packaging and deployment configuration not yet implemented.

## Latest Session Improvements (2026-05-18)

1. **Home Page Enhancements**
   - Implemented 5-minute cache TTL for environment lists
   - Added manual refresh button with loading states
   - Display last refresh timestamp
   - Support search/filter for environments

2. **Environment Detail Page**
   - Added caching to prevent reload on navigation
   - Tab-based UI fully functional (Config, Dependencies, Tutorial, History)
   - Manual refresh capability
   - Real dependency list display with version info

3. **System Scanner Improvements**
   - Auto-scans Python dependencies via `pip list --format=json`
   - Auto-scans Node dependencies via `npm list --depth=0 --json`
   - Cross-platform path handling (Windows/Mac/Linux)
   - Graceful error handling with fallback to empty list
   - Limits display to first 10 dependencies per environment

4. **Documentation**
   - Created comprehensive PROJECT_STATUS.md with:
     - Detailed completion status by module
     - Prioritized todo list
     - Known issues and technical debt
     - Next steps action plan
   - Updated AGENTS.md with latest improvements

## Verification Commands

Use these before reporting completion:

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run type-check
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run build:electron
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run build:vite
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run lint -- --quiet
```

For dev startup:

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run dev
```

If port 5173 is stuck:

```bash
lsof -ti tcp:5173 | xargs -r kill
```

If Electron says it failed to install correctly, run:

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH node node_modules/.pnpm/electron@30.5.1/node_modules/electron/install.js
```

## Handoff Guidance

Do not claim this is a finished enterprise-grade product. It is currently a working scaffold with partial real wiring.

Next best engineering steps:

1. Replace mock/skeletal dependency installation with real IPC progress events from `service/env-install`.
2. Make conflict repair produce an explicit preview before any system mutation.
3. Add safe backup and rollback replay per platform.
4. Add real file-picker IPC and OCR flow for documents/screenshots.
5. Decide whether to actually adopt shadcn/ui or remove that claim.
6. Add tests for scanner, demand parser, persistence, IPC routing, and conflict detection.
7. Clean lint warnings after behavior stabilizes.
