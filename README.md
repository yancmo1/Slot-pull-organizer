# 🎰 Cruise Slot Pull Organizer

An offline-first Progressive Web App (PWA) for organizing cruise slot pull events. Manage participants, track payments, and run day-of check-ins — all from your phone, even without internet.

## Features

- **Events Management** — Create, edit, archive, and duplicate slot pull events
- **Participant Roster** — Add/edit participants with buy-in amounts and payment tracking
- **Payment Tracking** — Auto-calculated payment status (unpaid / partial / paid)
- **Day-of Mode** — Large touch-friendly interface for quick check-ins and mark-paid actions
- **Live Totals** — Real-time summary of signed-up, checked-in, collected, and remaining amounts
- **Filters** — Filter by all, unpaid, checked-in, or waitlist
- **CSV Export** — Export event roster to CSV spreadsheet
- **JSON Backup** — Export/import all data as a JSON backup file
- **Offline-First** — All data stored locally in IndexedDB via Dexie.js; works fully offline after first load
- **PWA** — Installable on iOS and Android with service worker caching
- **Sync Queue** — Local-only sync abstraction, swappable for a backend later

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — build tool
- **Tailwind CSS** — utility-first styling (mobile-first, dark theme)
- **Zustand** — lightweight state management
- **Dexie.js** — IndexedDB wrapper for offline persistence
- **vite-plugin-pwa** — PWA manifest + Workbox service worker
- **Vitest** + **React Testing Library** — unit tests

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output is in the `dist/` directory. The build includes:
- Optimized JS/CSS bundles
- PWA manifest (`manifest.webmanifest`)
- Service worker (`sw.js`) with Workbox precaching

## Tests

```bash
npm test
```

Runs 18 unit tests covering:
- Payment status calculation logic
- Event totals calculation (signed up, checked-in, waitlist, money totals)
- Participant CRUD logic (soft delete, waitlist, payment status)

## Project Structure

```
src/
├── types/          # TypeScript interfaces (Event, Participant, SyncQueueItem)
├── lib/
│   ├── db/         # Dexie IndexedDB setup
│   ├── sync/       # Sync queue abstraction
│   └── utils/      # paymentStatus, totals, export helpers
├── store/          # Zustand stores (eventStore, participantStore)
├── components/     # Shared UI (Button, Badge, Modal, Input, Textarea)
├── features/
│   ├── events/     # EventListScreen, EventDetailScreen, EventCard, EventForm
│   ├── participants/ # ParticipantRow, ParticipantForm
│   ├── dayof/      # DayOfScreen
│   └── settings/   # SettingsScreen (backup/restore)
└── tests/          # Vitest unit tests
```

## Data Models

### Event
- Title, trip label, date, time, location
- Buy-in amount, max players, notes
- Archived / soft-deleted flags

### Participant
- Display name, alias/real name
- Buy-in amount, amount paid, payment status (auto-calculated)
- Checked-in, waitlist flags
- Soft-deleted via `deleted_at`

## GitHub Pages Deployment

The app is configured to deploy automatically to GitHub Pages using the included GitHub Actions workflow (`.github/workflows/deploy-pages.yml`).

### Enable GitHub Pages

1. Go to your repository on GitHub.
2. Navigate to **Settings → Pages**.
3. Under **Source**, select **GitHub Actions**.
4. Save.

The next push to `main` will trigger the workflow and publish the app to:

```
https://<your-github-username>.github.io/Slot-pull-organizer/
```

### Manual Deploy Trigger

You can also trigger a deploy manually from the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**.

### How It Works

- The workflow runs `npm ci` and `npm run build` with `VITE_BASE_URL=/Slot-pull-organizer/` so asset paths are correct for the GitHub Pages sub-path.
- The built `dist/` folder is uploaded as a Pages artifact and deployed by the `actions/deploy-pages` action.
- The app uses `HashRouter` so deep-link navigation (e.g. opening an event page) works correctly on static hosting without a server-side fallback.

### Using a Custom Domain

If you configure a custom domain in GitHub Pages settings:

1. Set `VITE_BASE_URL=/` in the workflow file (since the app will be at the root path).
2. Push to `main` to redeploy.

## Offline & PWA

The app uses a service worker (via Workbox) to cache all assets on first load. After that, it works entirely offline. All data writes go to IndexedDB first. A sync queue captures all mutations for future backend integration.

To install as a PWA on iOS: open in Safari → **Share** → **Add to Home Screen**.
