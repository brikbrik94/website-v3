# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

OE5ITH Cloud Portal — a multi-page geo web app (interactive maps, routing, air-rescue status, coordinate conversion, live ADS-B/AIS tracking). Vanilla TypeScript + Vite frontend with a thin PHP backend proxy.

## Commands

```bash
npm run dev        # concurrently: Vite (frontend) + PHP dev server (api/, on 127.0.0.1:8081)
npm run dev:vite   # frontend only
npm run dev:api    # PHP API only (cd api && php -S 127.0.0.1:8081 router.php)
npm run build      # tsc (type-check, noEmit) && vite build → dist/
npm test           # vitest run (all tests)
npx vitest run src/api/AdsbInterpreter.test.ts   # single test file
npx tsc --noEmit   # type-check only
./deploy-website.sh  # build + rsync dist/ and api/ to /var/www/map.oe5ith.at, fix perms, reload nginx
```

Vite dev server proxies `/api/*` → the PHP server and strips the `/api` prefix. The PHP `router.php` mimics nginx, serving `*.php` endpoints directly.

**Always run `npx tsc --noEmit && npm test` before claiming a task complete.** `tsconfig` is strict with `noUnusedLocals`/`noUnusedParameters`, so dead code fails the build.

## Architecture

**Client-side routing (`src/main.ts`):** A path router maps URL paths (`/karte`, `/routing`, `/nah`, `/coords`, `/tracking`, `/info/*`) to page controllers via lazy `import()`. Internal navigation uses `.nav-link` anchors intercepted by event delegation + `history.pushState`. On every navigation the router calls `currentPage.destroy()` and `MapRegistry.clear()` before mounting the next page.

**Page lifecycle (`src/core/`):** Every page extends `BasePageController`, which implements `PageController` (`mount`/`destroy`). It owns an `AbortController`; `destroy()` aborts it. Use `this.signal` for any fetch and `this.fetchJson<T>(url)` for JSON requests so in-flight work is cancelled on navigation. **Never bypass this** — leaking listeners/requests across page changes is the main resource bug this design prevents.

**Feature structure (`src/features/<name>/`):** Each feature (coords, nah, routing, tracking) is split into a `*DataService` (data fetching/logic), `*MapLayers` (registers map sources/layers), and `*SidebarAdapter` (UI wiring). The page controller in `src/pages/` orchestrates them: render layout → register map resources → init `MapCore` → wire sidebar/topbar/legend.

**Map infrastructure (`src/lib/`):** `MapCore` initializes MapLibre GL. `MapRegistry` is a central store of map sources/layers/images that survives basemap style changes (re-applied on style reload) and is cleared between pages. `TerrainManager` handles 3D terrain. `MapLegend`, `PopupManager`, `GeocoderService`, `Toast` (central feedback), `GlobalModals` are shared singletons/utilities.

**Info portal (`/info/*`, `src/pages/InfoPage.ts` + `src/components/info/`):** Modular system-status dashboard. Modules: NAH status, Service Health (live API pings), Regions analysis, Tracking telemetry, Map Inventory, Debug. Subpath selects the active module.

**PHP API (`api/`):** Read-only proxy/aggregator over the backend DB and external services (ORS routing, geocoder, tile server, ADS-B/AIS). Each endpoint is a standalone `*.php` file (`nah.php`, `stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …).

## Project conventions

- **Design system / CI compliance:** All UI/CSS must follow the `oe5ith-ci` git submodule (a shared design system). **Read `oe5ith-ci/docs/for-coding-agents.md` before any UI change.** Do not invent visual patterns if one already exists there (page types, components, tokens).
- **No hardcoded values:** Never hardcode colors, radii, shadows, z-index, etc. In CSS use CI tokens (`var(--accent)`, `var(--z-topbar)`, …) from `src/styles/common.css`. In JS/TS map code use the dynamic getters in `src/lib/MapStyles.ts` (`MAP_COLORS`, `MAP_ROUTE_STYLES`), which resolve CI CSS tokens at runtime with fallbacks — never write hex values.
- **Styling:** Vanilla CSS, one file per concern under `src/styles/`, imported via `src/app.css`. No CSS framework.
- **Versioning:** Single source of truth is `src/version.ts` (SemVer). Keep a `-dev` suffix during development; finalize the version only after full verification.
- **Changelog:** Document every change in `CHANGELOG.md` with date and time (`YYYY-MM-DD HH:mm`).
- **Secrets:** API credentials live in `api/config.local.php` (gitignored; see `config.local.php.example`). The DB must be accessed only via the read-only `web_api_user`. Never commit secrets or `.env`.
- **Language:** Code comments and UI copy are largely German; match the surrounding language of the file you edit.

## Working style

These mandates (from `AGENT_INSTRUCTIONS.md` / `GEMINI.md`) have priority in this repo:

- **No independent interpretation:** Execute tasks exactly as requested. Apply surgical, idiomatic changes scoped to the request — don't expand scope or refactor unprompted.
- **Ask when uncertain:** If a requirement is ambiguous, ask rather than guess.
- **Research before fixing:** Map dependencies and reproduce a bug before changing code; include tests with fixes.
- **Verify exhaustively:** Verification before completion is mandatory — see the commands above.
