# Plan Review — quick add, capacity, paid toggle, sandbox

Date: 2026-04-20

## Scope

Requested fixes:

1. Quick Add names should visibly normalize while typing.
2. `max_players = 0` should mean unlimited/default.
3. Inline participant rows should expose a fast `Paid` toggle alongside check-in.
4. The dev sandbox should render day-of previews without importing the live day-of container/store path.

## Acceptance criteria

- Quick Add in `src/features/events/EventDetailScreen.tsx` formats the visible input live while typing, and the sandbox quick-add preview mirrors that behavior.
- New and existing events with `max_players = 0` behave as unlimited: no capacity warnings and no auto-waitlist defaults.
- `ParticipantRow` exposes a `Paid` quick toggle next to check-in using the existing `amount_paid` / derived `payment_status` model.
- The sandbox day-of preview uses store-free fixture components and does not import `src/features/dayof/DayOfScreen.tsx`.

## Implementation shape

Single atomic implementation phase.

- Normalize non-positive max-player values at the boundary (`0 -> null`) and reuse the existing `null = unlimited` behavior.
- Update quick-add name formatting to a stricter live casing helper so users see the normalized name as they type.
- Define the `Paid` checkbox rule explicitly:
  - checked => set `amount_paid = buy_in_amount`
  - unchecked from fully paid => set `amount_paid = 0`
  - partial payments remain unchecked; the quick toggle is only a full-paid / unpaid shortcut
- Decouple sandbox day-of preview from the live day-of screen by extracting shared presentational UI into store-free component(s), then have the sandbox render fixture data through those components.

## Reviewer comments

Status: NEEDS_REVISION before implementation details were clarified.

Blocking points raised:

- The sandbox must not import from `src/features/dayof/DayOfScreen.tsx`, because that pulls the live store/Dexie path into the sandbox preview.
- The `Paid` quick toggle needed an explicit rule for partial payments to avoid ambiguous or destructive behavior.

Resolution applied to implementation plan:

- Sandbox preview will be decoupled from `DayOfScreen` and use store-free shared components only.
- The `Paid` toggle is defined as a binary shortcut for fully paid vs unpaid; partial amounts remain editable in the existing full participant form/day-of flow.

## Final implementation notes

- `src/lib/utils/formatName.ts` now fully normalizes mixed-case names while preserving spaces, apostrophes, and hyphens, and both the real quick-add input and sandbox quick-add preview apply it live on every keystroke.
- `src/features/events/EventForm.tsx`, `src/features/events/EventDetailScreen.tsx`, and `src/lib/utils/participantDefaults.ts` normalize non-positive `max_players` values to the existing unlimited (`null`) semantics so legacy `0` records no longer trip capacity or waitlist defaults.
- `src/features/participants/ParticipantRow.tsx`, `src/store/participantStore.ts`, and `src/lib/utils/paymentStatus.ts` add an inline `Paid` checkbox beside `Checked in`; toggling it maps to full buy-in or zero and lets the existing derived payment-status model do the rest.
- `src/features/dayof/DayOfParticipantCard.tsx` was extracted as a store-free shared component, `src/features/dev/DevSandboxScreen.tsx` now renders its day-of preview through that component, and `src/App.tsx` bypasses app-shell sync/bootstrap on `#/dev/sandbox` so direct sandbox loads avoid the live IndexedDB path.
- Added focused regression coverage in `src/tests/formatName.test.ts`, `src/tests/participantEntry.test.ts`, and `src/tests/paymentStatus.test.ts`.

## Deviations from plan

- No material deviations. The only implementation detail added during verification was the `src/App.tsx` sandbox-route bypass to fully satisfy the “no real IndexedDB path on direct sandbox load” expectation.

## Final review outcome

Status: APPROVED.

Reviewer confirmed:

- live quick-add normalization is visible while typing
- `max_players = 0` behaves as unlimited/default
- the participant list exposes a working `Paid` checkbox alongside check-in
- the dev sandbox uses store-free day-of preview components and bypasses app-shell sync/bootstrap on direct sandbox loads

## Verification

- `npm test` ✅ (`11` files, `64` tests passed)
- `npm run build` ✅
- live Vite dev-server sanity check ✅ (`DevSandboxScreen.tsx` and `App.tsx` served via HMR transform)
