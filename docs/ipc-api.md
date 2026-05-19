# EnvGuard IPC API

Renderer code must call the main process through `src/api/envguard.ts`.
Direct filesystem, shell, PATH, or environment-variable access from React code is forbidden.

## Implemented channels

- `system:scan`: scan local development tools, PATH entries, virtual environment hints, and system variables.
- `env:list`: load locally persisted managed environments.
- `env:create`: create a managed environment and persist it.
- `env:delete`: remove a managed environment, optionally deleting its data directory.
- `demand:parse`: parse text, document text, or OCR text into an environment recommendation.
- `conflict:detect`: scan and summarize environment conflicts.
- `conflict:fix`: run the current automatic repair flow and save a repair record.
- `repair-records:list`: load persisted repair records.
- `config:get`: load local settings.
- `config:set`: save local settings.

## Pending production hardening

- Real-time dependency install progress events.
- System-level PATH mutation with per-platform permission confirmation.
- Full rollback replay from backups.
- Signed auto-update flow.
