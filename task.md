# HULAGWAY Mobile PWA — Task Tracker

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

## Phase 1 — Foundation & Theme
- [x] Scaffold exists (Vue 3 + TS + Vite + Pinia + Router)
- [x] Theme: orange gradient palette (#F97316 anchor) + DM Sans/Poppins fonts (Tailwind v4 `@theme` tokens in `src/assets/main.css`)
- [x] App shell layout (`src/layouts/AppLayout.vue`: gradient header + responsive bottom nav, max-w container)
- [x] Logo/icon assets received → generated `pwa-192/512`, `apple-touch-icon`, `favicon.ico` from `logo.png`
- [x] Router with all module routes + placeholder pages; build verified (`npm run build` ✓)

## Phase 2 — Core Plumbing
- [x] Dependencies installed (tailwindcss, @tailwindcss/vite, axios, idb, vite-plugin-pwa)
- [x] `vite-plugin-pwa` configured (manifest #F97316, workbox precache + api/font runtime caching)
- [x] Axios instance (`services/api.ts`: base URL via VITE_API_URL, Bearer token interceptor, 401 redirect)
- [x] IndexedDB layer (`database/indexedDb.ts`: surveys cache, responses + status index, sync history)
- [x] Pinia stores: `auth`, `survey`, `sync`

## Phase 3 — Features
- [x] Auth: login/logout, token persistence, route guards (`router/index.ts`)
- [x] Dashboard (available surveys, pending sync counts, quick actions)
- [x] Available Surveys list (network-first, cached offline in IndexedDB)
- [x] Survey Form (dynamic renderer: text/textarea/number/date/radio/checkbox/dropdown, GPS capture, required validation, save draft / submit)
- [x] Draft Responses + Pending Synchronization screen (manual Sync Now, per-record errors, attempts)
- [x] Sync Manager (`stores/sync.ts`): connectivity watch, batch POST `/api/mobile/sync`, UUID idempotency handling, auto-retry on reconnect
- [x] Sync History screen
- [x] Profile / Settings screen (user info, connection status, logout)

## Phase 4 — Polish & Verification
- [x] Offline caching of app shell/assets (workbox precache + API/font runtime caching)
- [x] `vue-tsc` typecheck + `oxfmt` formatting clean; production build ✓ (sw.js generated)
