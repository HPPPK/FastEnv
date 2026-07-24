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
- `log:get`, `log:clear`, and `log:export`

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

- Real shadcn/ui component library is not installed or generated; decide whether to adopt it after behavior stabilizes.
- Dependency installation now has real progress/cancellation IPC, pre/post package snapshots, failure classification, partial-success reporting, and isolated regression coverage; real network/permission/disk failures and safe rollback still need Windows validation.
- Conflict repair has Windows real UAC/UI evidence; macOS/Linux authorization, write, verification, and rollback still require isolated machine validation.
- Full backup replay and rollback semantics are not production-grade for all environment variables.
- OCR/image parsing UI is not actually integrated; screenshot mode currently handles text-like OCR content only.
- Log query/clear/export and configuration import/export have a basic IPC/UI loop; native text file picker is wired for TXT/MD/JSON/LOG, while PDF/DOCX/OCR remain incomplete.
- Auto-update, startup integration, context menu integration, and polished installer UX are not implemented.
- Cross-platform packaging and publishing are not complete.

## Latest Session Improvements (2026-07-23)

1. **Dependency installation cancellation**
   - Replaced synchronous install commands with asynchronous child processes.
   - Added operationId and AbortController wiring through the Electron IPC layer.
   - Added env:install-cancel and Windows taskkill process-tree cleanup.
   - Added package/mirror shell-character validation and a cancellation regression test.

2. **Cross-platform validation workflow**
   - Added .github/workflows/cross-platform-validation.yml for Windows, macOS, and Linux.
   - CI runs type-check, Electron compilation, elevation protocol boundary tests, and install cancellation tests.
   - CI intentionally does not write real Windows registry or macOS/Linux system profile files.

3. **Documentation**
   - Added docs/cross-platform-validation.md.
   - Added docs/next-priority.md.
   - README.md now reflects the cancellation implementation and the remaining real-platform evidence.

## Verification Commands

Use these before reporting completion:

```
# dependency cancellation regression
corepack pnpm run test:install-cancel
corepack pnpm run test:install-failures
corepack pnpm run test:file-ingest
corepack pnpm run test:config-log
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

1. Validate real Windows network, permission, disk-space, multi-package failure, post-install consistency, and safe rollback cases.
2. Add PDF/DOCX extraction, image OCR, preview, retry, and user confirmation on top of the text file picker.
3. Extend environment-variable transactions and replayable rollback after the PATH path is stable.
4. Add unit, IPC, renderer, Electron E2E, concurrency, and stress tests.
5. Decide whether to adopt shadcn/ui after behavior and Windows packaging stabilize.


## Follow-up Improvements (2026-07-23)

- Completed the P1 log/config IPC slice: native config import/export, structured log query, log clear/export, settings-page controls, and isolated regression coverage.
- Configuration imports validate the snapshot and restore the previous data set when persistence fails; imports never mutate system PATH or shell profiles.
- Added docs/config-log-ipc.md; keep README, AGENTS.md, and docs/next-priority.md synchronized when this behavior changes.
- The next evidence gap remains real macOS/Linux authorization, write verification, rollback, and restart validation. CI is intentionally isolated and is not evidence of real system-level mutation.


## Follow-up Improvements (2026-07-24)

- Added install-before/after dependency snapshots, failure classification, rollback candidates, and consistency status.
- Added isolated network/permission/peer-conflict/partial-success tests in scripts/run-install-failure-cases.cjs.
- Added native file:pick for bounded text requirement files and documented the remaining PDF/DOCX/OCR boundary.
- Fixed the CI pnpm setup order and stabilized cross-platform elevation/cancellation regression tests; run 30092390926 passed on Windows, macOS, and Linux.
- Published Windows x64 v0.1.3 NSIS and Portable assets; the assets are unsigned and may trigger SmartScreen warnings.
- macOS/Linux real system authorization, write verification, rollback, and packaging remain intentionally deferred.
