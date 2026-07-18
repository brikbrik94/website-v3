# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

OE5ITH GeoPortal — a multi-page geo web app (interactive maps, routing, air-rescue status, coordinate conversion, live ADS-B/AIS tracking). Vanilla TypeScript + Vite frontend with a thin PHP backend proxy.

Bevor du nach den hier ergänzten, repo-spezifischen Angaben handelst: lies zuerst
[AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) vollständig — die dortigen Mandate sind
verbindlich und werden hier nicht wiederholt.

## Commands

```bash
npm run dev        # concurrently: Vite (frontend) + PHP dev server (api/, on 127.0.0.1:8081)
npm run dev:vite   # frontend only
npm run dev:api    # PHP API only (cd api && php -S 127.0.0.1:8081 router.php)
npm run dev:reset  # bei hängenden Dev-Server-Resten (z.B. "504 Outdated Optimize Dep" im Browser,
                   # obwohl npm run dev läuft): killt Prozesse auf Port 8000/8081, leert den
                   # Vite-Cache. Tritt auf, wenn eine frühere Session beendet wurde, ohne die
                   # concurrently-Kindprozesse zu stoppen — danach npm run dev neu starten.
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

**Map infrastructure (`src/lib/`):** `MapCore` initializes MapLibre GL. `MapRegistry` is a central store of map sources/layers/images that survives basemap style changes (re-applied on style reload) and is cleared between pages. `TerrainManager` handles 3D terrain. `MapLegend`, `PopupManager`, `HoverCursor` (`attachHoverCursor(map, layerIds)` — pointer cursor on hover for clickable layers, idempotent, no manual cleanup needed), `GeocoderService`, `Toast` (central feedback), `GlobalModals` are shared singletons/utilities. Full inventory of `src/lib/` building blocks (what it does, exports, import path): [docs/architecture/bausteine.md](./docs/architecture/bausteine.md) — auto-generated (`npm run docs:bausteine`), re-run after changes to `src/lib/`.

**Info portal (`/info/*`, `src/pages/InfoPage.ts` + `src/components/info/`):** Modular system-status dashboard. Modules: NAH status, Service Health (live API pings), Regions analysis, Tracking telemetry, Map Inventory, Debug. Subpath selects the active module.

**PHP API (`api/`):** Read-only proxy/aggregator over the backend DB and external services (ORS routing, geocoder, tile server, ADS-B/AIS). Each endpoint is a standalone `*.php` file (`nah.php`, `stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …).

## Standards-Referenzen

Generische, repo-unabhängige Standards (SemVer, Keep a Changelog, Conventional Commits, PSR-12,
EditorConfig, WCAG, ARIA APG, OWASP Top 10, Twelve-Factor Config) samt Pflege-Regel für neue
Standards sind in [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) referenziert (dort auch, warum
referenzieren statt neu erfinden). Was folgt, ergänzt nur, was **spezifisch für dieses Repo**
ist: Domäne (Geodaten), Submodule (`oe5ith-ci`), und die konkrete Anwendung/der Umsetzungsstand
der generischen Standards hier.

### Code-Stil & Formatierung (repo-spezifisch)

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| BEM (Block Element Modifier) | https://getbem.com/ | CSS-Klassennamen | **primär Sache von `oe5ith-ci`** (dort ist die kanonische Namenskonvention für Komponenten definiert — vor Einführung `oe5ith-ci/docs/for-coding-agents.md` prüfen); website-v3-eigenes CSS (`src/styles/`) nutzt aktuell uneinheitliche Präfixe (`acc-*`, `badge-*`, teils schon `__`/`--`) |

PSR-12 (`api/*.php`) und EditorConfig (Repo-Root) sind generisch in AGENT_INSTRUCTIONS.md
referenziert; Umsetzungsstand/Audit hier: PSR-12 bisher **nicht** geprüft/durchgesetzt (Audit als
Aufgabe in TODO.md), `.editorconfig` neu eingeführt und an bestehenden Stil angeglichen (2 Spaces
JS/TS/CSS/JSON, 4 Spaces PHP).

### API-Design & Dokumentation

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| OpenAPI 3.x (vormals Swagger) | https://spec.openapis.org/oas/latest.html | Sollstandard zur formalen Beschreibung der `api/*.php`-Endpoints (Pfade, Query-Parameter, Response-Schemas) | bisher keine OpenAPI-Spec vorhanden — jeder Endpoint ist eine eigenständige PHP-Datei ohne formales Schema; Erstellung als Aufgabe in TODO.md |

### Geodaten & Zeitformate

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| GeoJSON (RFC 7946) | https://www.rfc-editor.org/rfc/rfc7946 | Alle Map-Sources/-Layer (`FeatureCollection` in `*MapLayers.ts`) | keine — wird schon befolgt, war nur bisher nicht referenziert |
| WGS84 / EPSG:4326 | Referenz-CRS für GPS/Web-Mapping | Koordinaten in Coords-/Routing-/Tracking-Feature | keine, sofern nicht explizit ein anderes CRS (z.B. UTM) im Spiel ist |
| ISO 8601 | Datum-/Zeitformat | `CHANGELOG.md`-Zeitstempel (`YYYY-MM-DD HH:mm`) | kein `T`-Trenner/keine Zeitzone (bewusst vereinfacht für Lesbarkeit, kein maschinelles Parsing nötig) |

### Accessibility (repo-spezifische Anwendung)

WCAG 2.1/2.2 (Ziel: Stufe AA) und die ARIA Authoring Practices Guide sind generisch in
AGENT_INSTRUCTIONS.md referenziert. Umsetzungsstand hier: größtenteils ungeprüft; Basis-Doku ist
in `oe5ith-ci/docs/roadmap.md` als `docs/accessibility.md` geplant (für Komponenten),
website-v3-eigene Widgets (Kontextmenüs, Karten-Controls) sind eigenständig zu prüfen. ARIA-APG
noch nicht angewandt — konkret relevant für die ROADMAP.md-Punkte „Legende" (Listbox-Pattern) und
„Routing-Kontextmenü" (Menu-Pattern).

### Architektur, Security & Performance (repo-spezifisch)

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| Architecture Decision Records (ADR) | https://adr.github.io/ | Formatvorbild für `docs/superpowers/specs/*-design.md` (Kontext/Entscheidung/Konsequenzen) | lose angelehnt, kein striktes ADR-Template; keine Rückwirkende Umformatierung bestehender Specs geplant |
| Core Web Vitals (LCP, INP, CLS) | https://web.dev/articles/vitals | Zielmetriken für Ladezeit/Interaktivität der Karte | ungemessen; hängt an den Performance-Punkten aus dem Map-Subsystem-Cleanup (v.a. U3 Sprite-Caching, siehe TODO.md) |

Twelve-Factor Config und OWASP Top 10 sind generisch in AGENT_INSTRUCTIONS.md referenziert;
konkrete Umsetzung hier: Secrets nur in `api/config.local.php`, DB-Zugriff nur über den
Read-only `web_api_user` — siehe Project conventions unten. Kein systematischer OWASP-Abgleich
bisher — Self-Check als Aufgabe in TODO.md.

Folgearbeiten aus den oben genannten Abweichungen sind in [TODO.md](./docs/TODO.md) (Angleichung
bestehenden Codes/bestehender Docs an einen Standard) bzw. [ROADMAP.md](./docs/ROADMAP.md) (größere,
noch nicht existierende Initiativen) erfasst.

**Pflege dieser Sektion:** Neue **repo-/domänenspezifische** Standards (z.B. ein neues Geodatenformat,
ein neues API-Schema) hier eintragen. Neue **generische** Standards (Sprache/Tool-Styleguides,
die auch in anderen Repos gälten) gehören stattdessen in AGENT_INSTRUCTIONS.md — siehe dortige
Pflege-Regel.

## Project conventions

- **Design system / CI compliance:** All UI/CSS must follow the `oe5ith-ci` git submodule (a shared design system). **Read `oe5ith-ci/docs/for-coding-agents.md` before any UI change.** Do not invent visual patterns if one already exists there (page types, components, tokens).
- **Never fix bugs inside `oe5ith-ci` from this repo.** The submodule is maintained externally with its own review/checks process. If a bug in the shared design system (tokens, components) is found while working here, document it — don't fix it — in `docs/ci/bug-reports.md` (context, root cause, reproduction, the fix already validated locally in website-v3 if any, impact on other OE5ITH portals), analogous to `docs/ci/*-request.md` files used for feature requests and `docs/ci/handoff-*.md` files used for ready-to-implement handoffs. These files are committed normally in this repo (unlike the previous convention of leaving them uncommitted in the submodule's working tree) — reference them from `TODO.md` with a short pointer, not a full description.
- **No hardcoded values:** Never hardcode colors, radii, shadows, z-index, etc. In CSS use CI tokens (`var(--accent)`, `var(--z-topbar)`, …) from `src/styles/common.css`. In JS/TS map code use the dynamic getters in `src/lib/MapStyles.ts` (`MAP_COLORS`, `MAP_ROUTE_STYLES`), which resolve CI CSS tokens at runtime with fallbacks — never write hex values.
- **Styling:** Vanilla CSS, one file per concern under `src/styles/`, imported via `src/app.css`. No CSS framework.
- **Versioning & changelogs & releases:** See the dedicated **Releases, versioning & git** section below. Short version: `src/version.ts` is the SemVer single source of truth (shown in the sidebar), **both** changelogs must be updated on every release, and releases follow a fixed checklist.
- **Secrets:** API credentials live in `api/config.local.php` (gitignored; see `config.local.php.example`). The DB must be accessed only via the read-only `web_api_user`. Never commit secrets or `.env`.
- **Language:** Code comments and UI copy are largely German; match the surrounding language of the file you edit.

## TODO vs. Roadmap

The generic TODO/Roadmap split convention (file pairs, criteria, archive handling) is defined in
[AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md#3-todo-vs-roadmap). Repo-specific note: those
files are self-contained and readable without opening `docs/superpowers/plans/*` — those design
docs remain optional deep-dive context/history, never the sole source of truth for "what needs
doing".

## Releases, versioning & git

The generic release/versioning/git convention (SemVer + Keep a Changelog + Conventional Commits,
version-bump timing, commit/tag format, release checklist, scratch hygiene) is defined in
[AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md#4-releases-versionierung--git). What follows is
this repo's concrete implementation of that convention.

**Two changelogs exist here and BOTH must be kept current — they have different audiences and neither is generated from the other:**

1. **`CHANGELOG.md`** (`docs/CHANGELOG.md`, moved from repo root 2026-07-18) — the technical record, Keep-a-Changelog-structured, all 6 official categories in German (`Hinzugefügt` / `Geändert` / `Veraltet` / `Entfernt` / `Behoben` / `Sicherheit` — i.e. Added/Changed/Deprecated/Removed/Fixed/Security), used as needed (not every entry needs every category).
2. **The in-app changelog** shown when the user clicks the version in the sidebar — currently hardcoded HTML in `src/lib/GlobalModals.ts` (`changelog-modal-body`). This is a **curated, user-facing** summary in plain German (no internal symbol/function/file names), grouped as „Neuigkeiten & Features" / „Verbesserungen & Fixes". **Known debt: it currently lags behind `CHANGELOG.md`; pull it forward on the next UI touch.** (Intended future improvement: render it collapsibly — headline first, details on click — or generate it from a single curated source.)

**Versioning:** `src/version.ts` (`APP_VERSION`) is the SemVer single source of truth; `package.json`'s `version` field is kept in sync on every release (bumped alongside `src/version.ts`, step 2 below) purely for tooling/display consistency — it is not itself authoritative. (Known history: this drifted unsynced from v3.3.1 through v3.9.0 before being caught and resynced at v3.10.0 — keep both in the same commit going forward.)

**Commits & tags:** German subject after the Conventional-Commits prefix; `release: vX.Y.Z — …` for the release commit (repo-specific type, not part of the spec). The `oe5ith-ci` submodule is versioned independently (its own `vX.Y.Z` tags).

**Release checklist (concrete commands):** (1) `npx tsc --noEmit && npm test` green → (2) bump `src/version.ts` **and** `package.json`'s `version` field → (3) consolidate `CHANGELOG.md` into the `[X.Y.Z]` heading → (4) update the in-app changelog (`GlobalModals.ts`) → (5) `npm run build` → (6) commit `release: vX.Y.Z`, annotated tag `vX.Y.Z`, push commit + tag → (7) deploy with `./deploy-website.sh`.

## Working style

Core mandates (no independent interpretation, ask when uncertain, research before fixing, verify
exhaustively) are defined in [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md#1-core-mandates) and
have priority in this repo. Repo-specific verification commands: see **Commands** above.
