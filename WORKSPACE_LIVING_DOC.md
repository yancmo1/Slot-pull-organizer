# WORKSPACE_LIVING_DOC (Repo Source of Truth)

This document is the **single source of truth** for how this repo works:

- Architecture and major components
- Local dev workflow
- Test/build commands
- Deployment notes
- Decisions and follow-ups (Session Log)

## Read first

- `AGENTS.md` (agent entrypoint)
- `.github/copilot-instructions.md` (agent guardrails)

## Session Log

Append short entries here when changes affect:

- schema / data model
- endpoints / auth / permissions
- workflow / automation
- anything that could surprise future contributors

---

### 2026-04-04 — Backup/Restore hardening + Privacy + Clear All Data

**What changed:**
- `src/lib/utils/export.ts`: `exportAllToJSON` is now async and reads directly from IndexedDB (all 4 tables). Added `BackupData` interface (`schema_version: 1`). Added exported `assembleBackupData()` helper (testable without DOM). `importFromJSON` now rejects files >10 MB, validates `schema_version`, enforces arrays for `events`/`participants`, validates required fields per record, defaults `spinRoundEntries`/`eventSessions` to `[]` for legacy files.
- `src/features/settings/SettingsScreen.tsx`: Removed `useParticipantStore` and `events` from `useEventStore` (export no longer needs in-memory state). Import flow now triggers a safety backup download before writing, wrapped in a Dexie transaction across all 4 tables. Added Privacy Notice card and Danger Zone / Clear All Local Data card using `ConfirmDialog`.
- `src/tests/backup.test.ts`: New — 12 tests covering `assembleBackupData` shape and `importFromJSON` rejection/acceptance cases. Uses `vi.mock` for Dexie.

**Why:** Export was incomplete (used stale Zustand state); import had no validation, no transactional safety, no size cap; no privacy disclosure; no data-clearing escape hatch.

**Risks/mitigations:** Safety backup downloads before any import write — user gets a pre-import snapshot even if the import fails. `window.location.replace('/')` after clear resets all React state cleanly.

**Follow-ups:** None scoped here.
