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

### 2026-04-21 — Pending sync note + Facebook-ready attendee list

**What changed:**

- `src/components/SyncStatusCard.tsx` now adds a dedicated "Unsynced changes" note whenever local queue items are still pending, so Event List, Event Detail, Settings, and the dev sandbox all surface that state consistently.
- `src/lib/utils/export.ts` now includes `buildEventAttendeeList()` for a copy/paste-friendly event roster format that separates active attendees from waitlist names.
- `src/features/events/EventDetailScreen.tsx` now adds an `Attendee List` action that opens a modal preview and supports one-tap copy for Facebook posts/messages alongside the existing CSV export.
- `src/tests/exportFormatting.test.ts` covers the attendee-list formatting behavior.

**Why:** Users need clearer trust signals when local changes still have not synced, and a quick social-ready roster export is faster than hand-formatting names for Facebook posts.

**Risks/mitigations:** The attendee export is additive and leaves the CSV flow unchanged. Clipboard copy falls back gracefully by still showing the full formatted text in a selectable textarea if browser copy permissions fail.

**Follow-ups:** If roster posting needs alternate formats later, add templates (for Facebook, text, email) on top of the shared formatter instead of duplicating formatting logic in the screen.

### 2026-04-20 — Sync queue ordering fix for PocketBase flushes

**What changed:**

- `src/lib/sync/index.ts` now sorts pending sync queue items deterministically by `created_at`, then by entity/action tie-breakers so creates flush before later updates/deletes for the same record.
- `src/tests/syncQueue.test.ts` reproduces the failure mode where a queued update can otherwise hit PocketBase before the corresponding create.

**Why:** Phone/web/server mismatches can happen when the Dexie sync queue returns pending items in random UUID order. In that case an update may run before the create exists remotely, leaving failed queue items and stale data across devices.

**Risks/mitigations:** The change is intentionally narrow and only affects flush ordering; payload formats and collection mappings stay the same. Tie-breakers keep same-timestamp create/update/delete sequences deterministic.

**Follow-ups:** Remote hard-delete pull propagation is still a separate gap; this fix only addresses outbound queue ordering.

### 2026-04-21 — Remote delete propagation + event child delete sync

**What changed:**

- `src/lib/sync/index.ts` now reconciles full-pull results against local Dexie tables, removing local event/participant rows that no longer exist on the server unless those rows still have unsynced queue items.
- `src/store/eventStore.ts` now queues participant delete operations before deleting an event so PocketBase does not keep orphan participant rows behind after an event is removed.
- `src/tests/pullChanges.test.ts` and `src/tests/eventStore.test.ts` cover remote delete reconciliation and event-child delete queueing.

**Why:** Sync could previously only add/update local rows on pull. If a record was deleted on another device or directly on the server, this device would keep stale local copies forever. Event deletion also removed child participants locally without telling the server, which could leave cross-device data drift.

**Risks/mitigations:** Pull reconciliation explicitly protects records that still have unsynced local queue items so failed/offline creates are not wiped out by an empty remote list. The event delete change keeps the diff narrow by only queueing related participant deletes; day-of local-only tables are unchanged.

**Follow-ups:** Historical orphan participants already left on PocketBase from earlier builds may still need one-time cleanup if they were created before this fix.

---

### 2026-04-20 — Whole-dollar cashier payout breakdown

**What changed:**

- `src/lib/utils/billBreakdown.ts` now adds `calculateCashierBillPlan()` so Day-of payout planning can distinguish between per-person bills, the greedy whole-dollar total, and cashier-ready bill bundles.
- `src/features/dayof/DayOfScreen.tsx` keeps the existing Bill Breakdown modal sections, but now removes cents from payout totals, bases the total section on whole-dollar per-person payouts, and adds a new "Get From Cashier" section for distribution-ready bills.
- `src/tests/billBreakdown.test.ts` now covers cashier bundle math, cent removal from totals, and sub-dollar payout edge cases.

**Why:** The old modal answered “what bills represent the total?” but not “what exact bills should I request from the cashier so I can hand each person the same bundle quickly?” Dropping cents from payout totals also makes the cashier plan line up with the actual whole-dollar cash being handed out.

**Risks/mitigations:** Cents are intentionally excluded from the payout totals in this flow and called out explicitly in the modal instead of being redistributed automatically. That keeps the plan predictable and fast for cash handling.

**Follow-ups:** If exact coin/change handling ever matters, add a separate change-distribution policy instead of folding it into the bill-only planner.

---

### 2026-04-20 — Quick add/payment toggles + `max_players=0` semantics

**What changed:**

- `src/features/events/EventDetailScreen.tsx` and `src/features/dev/DevSandboxScreen.tsx` now visibly normalize Quick Add names while typing instead of only on submit.
- `src/features/events/EventForm.tsx`, `src/features/events/EventDetailScreen.tsx`, and `src/lib/utils/participantDefaults.ts` now treat `max_players=0` as unlimited/default (`null`) so legacy zero-capacity events no longer show capacity warnings or auto-waitlist new names.
- `src/features/participants/ParticipantRow.tsx`, `src/store/participantStore.ts`, and `src/lib/utils/paymentStatus.ts` add a quick Paid toggle alongside check-in that flips between fully paid and unpaid using `amount_paid`/`payment_status`.
- `src/features/dayof/DayOfParticipantCard.tsx` was extracted as a store-free shared day-of card, and `src/App.tsx` now bypasses app-shell sync/bootstrap on `#/dev/sandbox`, so the dev sandbox can preview fixture data without importing `DayOfScreen` or touching the real IndexedDB path on direct sandbox loads.

**Why:** Quick-add entry now matches the existing participant-form capitalization behavior, zero-capacity legacy events behave like “no cap” instead of “always full,” participant rows support faster day-before payment cleanup, and the sandbox stays a safe UI-only preview surface.

**Risks/mitigations:** The quick Paid toggle intentionally overwrites partial amounts when used; detailed payment edits still live in the full participant form. `max_players=0` is normalized on save and treated as unlimited in the detail flow to stay compatible with older local/synced records.

**Follow-ups:** Repo-wide lint still has unrelated pre-existing issues in `src/features/events/EventListScreen.tsx` and `src/lib/sync/index.ts`.

---

### 2026-04-20 — Sync trust UX + faster participant entry + dev sandbox

**What changed:**

- `src/lib/sync/index.ts` now returns structured flush/pull results instead of silent voids, and `src/lib/sync/status.ts` provides shared sync-status summaries plus a single `runSyncAction()` path for list/detail/settings/App startup sync.
- `src/components/SyncStatusCard.tsx` + `src/store/syncStatusStore.ts` add shared sync trust UI and propagation so mounted screens reflect app-driven sync and local-only/offline/signed-out states consistently.
- `src/features/events/EventListScreen.tsx` now performs real sync on pull-to-refresh, refreshes event-card participant stats after sync, and uses differentiated empty states instead of one generic first-run message.
- `src/features/events/EventDetailScreen.tsx` now leads with a name-first Quick Add flow, keeps the full participant modal as a secondary path, hides list-management chrome until there is a roster, and shows more useful zero-results / zero-participants states.
- `src/features/participants/ParticipantForm.tsx` + `src/lib/utils/participantDefaults.ts` add alias entry, safer default values, capacity-aware waitlist defaults, stable sort-order defaults, and a save-and-add-another flow.
- `src/features/dayof/DayOfScreen.tsx` + `src/lib/utils/dayOfPriority.ts` add actionable filter chips, a clearer urgency order, and explicit copy that round/spin state stays local-only.
- `src/features/dev/DevSandboxScreen.tsx` adds a dev-only, fixture-driven sandbox route (`#/dev/sandbox`) for hot-reload component/state previews without touching real IndexedDB data.
- `src/lib/utils/export.ts` + `src/features/settings/SettingsScreen.tsx` now track/display the last backup export time and generate cleaner backup/CSV filenames.
- `README.md` was updated so product/setup/test copy matches the current sync-enabled app.

**Why:** The app was functional but still made syncing feel opaque, participant entry too modal-heavy for the real day-before workflow, and day-of prioritization harder than it needed to be. The new dev sandbox also makes it safer to iterate quickly without polluting real local data.

**Risks/mitigations:** Sync copy stays intentionally conservative — it says “latest available changes refreshed” and explicitly notes that day-of rounds/spin history remain local-only. The sandbox is gated behind `import.meta.env.DEV` and uses fixture/local state instead of writing to the real Dexie DB.

**Follow-ups:** Remote delete propagation is still unresolved, and the dev sandbox is a UI/state playground rather than a full seeded-flow harness.

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
