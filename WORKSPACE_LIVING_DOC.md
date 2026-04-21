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

### 2026-04-20 — PocketBase sync bugfix: blank `deleted_at` values

**What changed:**
- `src/lib/sync/index.ts` now normalizes PocketBase records so `deleted_at: ""` becomes `null` before writing to Dexie.
- `src/store/eventStore.ts` now treats falsy `deleted_at` values as active records when loading the event list.
- `src/tests/eventStore.test.ts` reproduces the production payload shape (`deleted_at: ""`) and verifies synced events still appear.

**Why:** PocketBase returned blank strings for unset `deleted_at`, but the event list only treated `null`/`undefined` as active. Synced events were written to IndexedDB successfully, then filtered out by the UI so the app looked empty after refresh.

**Risks/mitigations:** The fix is backwards-compatible — actual deletion timestamps remain truthy and still exclude deleted records. Existing pulled records with `deleted_at: ""` start showing immediately on the next load.

**Follow-ups:** Cross-device hard delete propagation still needs a dedicated design; the current full-pull strategy does not remove local records that were deleted remotely.

---

### 2026-04-04 — Backup/Restore hardening + Privacy + Clear All Data

**What changed:**
- `src/lib/utils/export.ts`: `exportAllToJSON` is now async and reads directly from IndexedDB (all 4 tables). Added `BackupData` interface (`schema_version: 1`). Added exported `assembleBackupData()` helper (testable without DOM). `importFromJSON` now rejects files >10 MB, validates `schema_version`, enforces arrays for `events`/`participants`, validates required fields per record, defaults `spinRoundEntries`/`eventSessions` to `[]` for legacy files.
- `src/features/settings/SettingsScreen.tsx`: Removed `useParticipantStore` and `events` from `useEventStore` (export no longer needs in-memory state). Import flow now triggers a safety backup download before writing, wrapped in a Dexie transaction across all 4 tables. Added Privacy Notice card and Danger Zone / Clear All Local Data card using `ConfirmDialog`.
- `src/tests/backup.test.ts`: New — 12 tests covering `assembleBackupData` shape and `importFromJSON` rejection/acceptance cases. Uses `vi.mock` for Dexie.

**Why:** Export was incomplete (used stale Zustand state); import had no validation, no transactional safety, no size cap; no privacy disclosure; no data-clearing escape hatch.

**Risks/mitigations:** Safety backup downloads before any import write — user gets a pre-import snapshot even if the import fails. `window.location.replace('/')` after clear resets all React state cleanly.

**Follow-ups:** None scoped here.

---

### 2026-04-20 — PocketBase sync backend + cross-device support

**What changed:**

**Infrastructure (`infra/` + `.github/workflows/`):**
- `infra/pocketbase/docker-compose.yml` — PocketBase Docker service: `ghcr.io/muchobien/pocketbase:latest`, binds `127.0.0.1:8090:8090`, named volume `pb_data`, healthcheck, `restart: unless-stopped`
- `.github/workflows/deploy-pocketbase.yml` — CI/CD workflow: connects via Tailscale, then SSHes to Oracle VM and writes the compose file + runs `docker compose pull && up -d`. Triggers on `infra/pocketbase/**` changes or `workflow_dispatch`.
- `.github/workflows/deploy-pages.yml` — Added `VITE_POCKETBASE_URL` env var to the build step so the PWA knows where to find PocketBase.

**New source files:**
- `src/lib/sync/pocketbase.ts` — Lazy PocketBase SDK singleton. Reads `VITE_POCKETBASE_URL` at runtime. Exports `getPocketBase()` and `isPocketBaseConfigured()`.
- `src/lib/sync/auth.ts` — `signIn(email, password)`, `signOut()`, `isSignedIn()`, `getAuthEmail()`. SDK persists auth token in localStorage automatically.

**Modified source files:**
- `src/lib/sync/index.ts` — Added `flushSyncQueue()` (reads pending Dexie `syncQueue` items → POSTs/PATCHes/DELETEs to PocketBase) and `pullChanges()` (fetches records updated since last cursor per collection → upserts into Dexie). Both guard on `isPocketBaseConfigured()` and `authStore.isValid`.
- `src/features/settings/SettingsScreen.tsx` — Added "Sync Account" card (sign-in form or signed-in state with Sync Now / Sign Out) visible only when `VITE_POCKETBASE_URL` is configured.
- `src/App.tsx` — `useEffect` auto-syncs on mount (`pullChanges` then `flushSyncQueue`) and on `window` online event, when signed in and online.

**Deployment details:**
- **Host:** Oracle VM (Free Tier) — `ubuntu@100.81.231.58` (Tailscale IP)
- **Port:** `127.0.0.1:8090` — never exposed publicly
- **Public URL:** `https://slotpull-pb.yancmo.xyz` (Cloudflare Tunnel → `localhost:8090`) — *tunnel ingress rule still needs adding manually*
- **Data dir:** Docker named volume `pb_data` on VM at `/opt/infra-new/apps/pocketbase/`
- **Admin UI:** `https://slotpull-pb.yancmo.xyz/_/` (once tunnel is configured)
- **GitHub Actions Secrets required:** `ORACLE_VM_SSH_KEY`, `ORACLE_VM_HOST`, `ORACLE_VM_USER`, `VITE_POCKETBASE_URL`, `TAILSCALE_AUTHKEY`

**Deployment gotchas learned:**
- Oracle VM IP `100.81.231.58` is a Tailscale IP — GitHub Actions runners need `tailscale/github-action@v2` to join the network first.
- `appleboy/ssh-action` and `appleboy/scp-action` run inside Docker containers which cannot reach Tailscale network interfaces on the host. Use a plain `run:` step with native `ssh` instead.
- Tailscale SSH (`RunSSH`) was enabled on the VM and blocked the ephemeral GitHub runner (not in ACL). Disabled with `tailscale set --ssh=false` — regular `sshd` + `authorized_keys` now handles auth over the Tailscale tunnel.

**Remaining manual steps (not yet done):**
1. **Cloudflare Tunnel** — Add ingress rule on VM: `hostname: slotpull-pb.yancmo.xyz → service: http://localhost:8090`
2. **PocketBase schema** — Visit `https://slotpull-pb.yancmo.xyz/_/` once tunnel is live, create admin account, then create 4 collections with custom IDs enabled:
   - `events` — fields matching `Event` type (id, name, date, location, etc.)
   - `participants` — fields matching `Participant` type
   - `spin_round_entries` — fields matching `SpinRoundEntry` type
   - `event_sessions` — fields matching `EventSession` type
   - API rules for all: `@request.auth.id != ""`

**Why:** App was local-only (IndexedDB). Adding PocketBase enables full cross-device sync (phone ↔ tablet ↔ desktop) while preserving the offline-first local storage behaviour. Sync is opt-in — users must sign in via Settings → Sync Account.

**Risks/mitigations:** PocketBase is additive — if `VITE_POCKETBASE_URL` is unset or user is not signed in, all sync code no-ops and the app functions identically to before. IndexedDB remains the source of truth.
