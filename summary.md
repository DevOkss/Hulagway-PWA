# HULAGWAY Mobile PWA (hulagway-pwa)

## Overview
Offline-first **field data collection app** for HULAGWAY — used by Field Extension Personnel to answer community surveys in the field, even without internet, and synchronize results to the central Laravel server when connectivity returns.

Deliberately **narrow in scope**: no admin features. Management/monitoring lives in the web application.

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Vue 3 + TypeScript + Vite |
| State | Pinia |
| Routing | Vue Router |
| HTTP | Axios → Laravel REST API (`/api/*`) |
| Auth | Sanctum Bearer tokens |
| Offline Storage | IndexedDB (`idb`) — surveys metadata, drafts, sync queue, sync history |
| PWA | `vite-plugin-pwa` (manifest + service worker) |

## Modules
- Login
- Dashboard
- Available Surveys
- Survey Form (dynamic question types, GPS capture)
- Draft Responses
- Pending Synchronization
- Sync History
- Profile / Settings

## Offline Sync Design
1. Every submission gets a client-generated UUID (`local_uuid`) before saving to IndexedDB.
2. When online, the Sync Manager batches pending records to `POST /api/mobile/sync`.
3. The server rejects duplicates via the UUID (idempotency); successful records are marked synced locally.
4. Failed records keep `sync_attempts` / `last_sync_error` and retry with backoff on reconnect.

## Branding
Orange gradient palette anchored on `#F97316`; fonts DM Sans (body) + Poppins (headings). Logo/icon assets to be supplied by client (placeholders for now).

## Deployment (Vercel)
Live PWA hosted on **Vercel** (auto-deploys on push to `main`; SPA rewrites via `vercel.json`).
- API base: `VITE_API_URL` env or production fallback (`src/services/api.ts`); laptop dev override lives in gitignored `.env.development.local` (dev-mode only, never baked into builds).
- Never hardcode `localhost` URLs — use `src/utils/asset.ts` helpers for public assets/routes.
- Backend must allow the Vercel origin in `config/cors.php` (see `hulagway-backend`).

## Related Projects
- `../hulagway-backend` — Laravel API server this PWA talks to
- `../reference-design` — Horizon UI admin template (visual reference only)
