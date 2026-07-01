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

## Standards-Referenzen

Wo dieses Repo Konventionen vorschreibt, sind das — wo möglich — keine Ad-hoc-Regeln, sondern
bewusste Anwendungen etablierter, allgemein bekannter Standards. Ziel: nachvollziehbar bleiben
(woher kommt die Regel, warum gilt sie), und diese Konventionen 1:1 auf andere Repos übertragbar
machen (nicht nur auf website-v3). Jede Tabelle nennt die Quelle, wofür sie hier gilt, und bekannte
Abweichungen/den Umsetzungsstand.

### Versionierung & Release-Prozess

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| Semantic Versioning 2.0.0 | https://semver.org/ | `src/version.ts` (`APP_VERSION`), Git-Tags `vX.Y.Z` | keine |
| Keep a Changelog 1.1.0 | https://keepachangelog.com/de/1.1.0/ | Struktur & Kategorien von `CHANGELOG.md` | Kategorien deutsch benannt (`Hinzugefügt`/`Geändert`/`Entfernt`/`Behoben`); `Deprecated`/`Security` bisher ungenutzt; `[Unreleased]`-Einträge tragen zusätzlich Uhrzeit (`HH:mm`), erst bei Release auf Tages-Granularität konsolidiert |
| Conventional Commits 1.0.0 | https://www.conventionalcommits.org/en/v1.0.0/ | Commit-Prefixe (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `chore:`) | Subject auf Deutsch statt Englisch; `release: vX.Y.Z — …` ist kein offizieller Typ der Spec (nächstliegend wäre `chore(release):`) |

### Code-Stil & Formatierung

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| PSR-12 (PHP-FIG Coding Style) | https://www.php-fig.org/psr/psr-12/ | Sollstandard für `api/*.php` | bisher **nicht** geprüft/durchgesetzt — Audit als Aufgabe in TODO.md |
| EditorConfig | https://editorconfig.org/ | `.editorconfig` (Repo-Root) — Einrückung, Zeilenende, Charset, finale Newline pro Dateityp | keine (neu eingeführt, an bestehenden Stil angeglichen: 2 Spaces JS/TS/CSS/JSON, 4 Spaces PHP) |
| BEM (Block Element Modifier) | https://getbem.com/ | CSS-Klassennamen | **primär Sache von `oe5ith-ci`** (dort ist die kanonische Namenskonvention für Komponenten definiert — vor Einführung `oe5ith-ci/docs/for-coding-agents.md` prüfen); website-v3-eigenes CSS (`src/styles/`) nutzt aktuell uneinheitliche Präfixe (`acc-*`, `badge-*`, teils schon `__`/`--`) |

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

### Accessibility

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| WCAG 2.1/2.2 (Ziel: Stufe AA) | https://www.w3.org/WAI/WCAG22/quickref/ | Ziel-Mindeststandard für UI, keine volle Zertifizierung | größtenteils ungeprüft; Basis-Doku ist in `oe5ith-ci/docs/roadmap.md` als `docs/accessibility.md` geplant (für Komponenten), website-v3-eigene Widgets (Kontextmenüs, Karten-Controls) sind eigenständig zu prüfen |
| ARIA Authoring Practices Guide | https://www.w3.org/WAI/ARIA/apg/ | Pattern-Referenz für interaktive Widgets (Menüs, Modals, Kontextmenüs) | noch nicht angewandt — konkret relevant für die Roadmap-Punkte „Legende" (Menu/Listbox-Pattern) und „Routing-Kontextmenü" (Menu-Pattern), siehe ROADMAP.md |

### Architektur, Security & Performance

| Standard | Quelle | Wofür in diesem Repo | Bekannte Abweichung hier |
|---|---|---|---|
| The Twelve-Factor App — Faktor III „Config" | https://12factor.net/config | Begründung für „Secrets/Config nur in `api/config.local.php`, nie hardcoded/committed" | keine — wird schon befolgt |
| Architecture Decision Records (ADR) | https://adr.github.io/ | Formatvorbild für `docs/superpowers/specs/*-design.md` (Kontext/Entscheidung/Konsequenzen) | lose angelehnt, kein striktes ADR-Template; keine Rückwirkende Umformatierung bestehender Specs geplant |
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ | Begründungsrahmen für bestehende Security-Regeln (Read-only-DB-User, keine Secrets im Repo) | kein systematischer Abgleich bisher — Self-Check als Aufgabe in TODO.md |
| Core Web Vitals (LCP, INP, CLS) | https://web.dev/articles/vitals | Zielmetriken für Ladezeit/Interaktivität der Karte | ungemessen; hängt an den Performance-Punkten aus dem Map-Subsystem-Cleanup (v.a. U3 Sprite-Caching, siehe TODO.md) |

**Warum referenzieren statt neu erfinden:** Diese Standards sind branchenüblich, präzise
dokumentiert und werden von gängigem Tooling vorausgesetzt (SemVer von praktisch jedem
Paketmanager, Conventional Commits von Changelog-/Release-Automatisierung, PSR-12 von PHP-Lintern).
Wer dieses `CLAUDE.md` als Vorlage für ein anderes Repo übernimmt, kann die verlinkten Specs direkt
nachlesen statt Konventionen aus diesem Dokument zu erraten oder zu reverse-engineeren.

Der TODO/Roadmap-Split (siehe unten) ist **keine** externe Standard-Referenz, sondern eine
repo-eigene Konvention.

Folgearbeiten aus den oben genannten Abweichungen sind in [TODO.md](./TODO.md) (Angleichung
bestehenden Codes/bestehender Docs an einen Standard) bzw. [ROADMAP.md](./ROADMAP.md) (größere,
noch nicht existierende Initiativen wie die Datei-Aufsplittung von `CLAUDE.md`) erfasst.

**Pflege dieser Sektion:** Bevor ein neuer Dienst, eine neue Programmiersprache/-variante oder ein
neues technisches Format ins Repo eingeführt wird (z.B. weitere Backend-Sprache, neues Datenformat,
neues Frontend-Tooling), zuerst prüfen, ob dafür ein etablierter Community-Standard existiert
(Styleguide, Format-Spec, Best-Practice-Dokument). Wenn ja: hier mit Quelle/Wofür/Abweichung
eintragen statt eine eigene Ad-hoc-Regel zu erfinden. Wenn nein: das explizit vermerken (wie beim
TODO/Roadmap-Split oben), damit klar bleibt, was bewusste Eigenregel ist und was auf einem Standard
beruht.

## Project conventions

- **Design system / CI compliance:** All UI/CSS must follow the `oe5ith-ci` git submodule (a shared design system). **Read `oe5ith-ci/docs/for-coding-agents.md` before any UI change.** Do not invent visual patterns if one already exists there (page types, components, tokens).
- **No hardcoded values:** Never hardcode colors, radii, shadows, z-index, etc. In CSS use CI tokens (`var(--accent)`, `var(--z-topbar)`, …) from `src/styles/common.css`. In JS/TS map code use the dynamic getters in `src/lib/MapStyles.ts` (`MAP_COLORS`, `MAP_ROUTE_STYLES`), which resolve CI CSS tokens at runtime with fallbacks — never write hex values.
- **Styling:** Vanilla CSS, one file per concern under `src/styles/`, imported via `src/app.css`. No CSS framework.
- **Versioning & changelogs & releases:** See the dedicated **Releases, versioning & git** section below. Short version: `src/version.ts` is the SemVer single source of truth (shown in the sidebar), **both** changelogs must be updated on every release, and releases follow a fixed checklist.
- **Secrets:** API credentials live in `api/config.local.php` (gitignored; see `config.local.php.example`). The DB must be accessed only via the read-only `web_api_user`. Never commit secrets or `.env`.
- **Language:** Code comments and UI copy are largely German; match the surrounding language of the file you edit.

## TODO vs. Roadmap

*Internal convention — no external standard behind this split (see Standards-Referenzen above).*

Two separate pairs of tracking files exist at repo root, each self-contained (readable and
actionable without needing to open `docs/superpowers/plans/*` — those remain optional deep-dive
context/history, never the sole source of truth for "what needs doing"):

- **`TODO.md` / `TODO_ARCHIVE.md`** — work in the **current scope**: bugfixes, cleanup, and
  extensions to code/features that already exist.
- **`ROADMAP.md` / `ROADMAP_ARCHIVE.md`** — **new** features/functionality that don't exist in
  the code yet (not an extension of something already there).

When adding an item, write it so another agent can act on it without other context: what/where
(file:line if known), and why if non-obvious. Move completed items to the matching `*_ARCHIVE.md`
(don't delete history). If a shipped roadmap feature spawns follow-up cleanup, file that as a new
`TODO.md` entry rather than leaving it attached to the archived roadmap item.

## Releases, versioning & git

Base standards: Semantic Versioning + Keep a Changelog + Conventional Commits (links and known
deviations in **Standards-Referenzen** above). What follows are the repo-specific operative rules
on top of those standards.

**Two changelogs exist and BOTH must be kept current — they have different audiences and neither is generated from the other:**

1. **`CHANGELOG.md`** (repo root) — the technical record of changes, Keep-a-Changelog-structured. Every change gets an entry with date and time (`## [Unreleased] - YYYY-MM-DD HH:mm`) under `Behoben` / `Geändert` / `Hinzugefügt` / `Entfernt`. At release, the journal blocks since the last tag are consolidated into one `## [X.Y.Z] - <date>` heading.
2. **The in-app changelog** shown when the user clicks the version in the sidebar — currently hardcoded HTML in `src/lib/GlobalModals.ts` (`changelog-modal-body`). This is a **curated, user-facing** summary in plain German (no internal symbol/function/file names), grouped as „Neuigkeiten & Features" / „Verbesserungen & Fixes". It must be updated on every release with at least the user-visible highlights. It silently drifts otherwise — **known debt: it currently lags behind `CHANGELOG.md`; pull it forward on the next UI touch.** (Intended future improvement: render it collapsibly — headline first, details on click — or generate it from a single curated source.)

**Versioning:** `src/version.ts` (`APP_VERSION`) is the SemVer single source of truth. Bump it **in the release commit itself** — the same commit that consolidates `CHANGELOG.md` and gets tagged. (There is no mandatory `-dev` suffix between releases; the deployed build always equals a tagged release. Use a `-dev`/`-rcN` suffix only for an explicit pre-release.) The next version covers **all** unreleased commits since the last tag, so pick the bump from the whole range: **patch** = bugfixes only, **minor** = any new user-facing feature/capability in the range, **major** = breaking changes.

**Commits & tags:** Conventional-Commits-style prefixes with a German subject: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `chore:`, and `release: vX.Y.Z — …` for the release commit (repo-specific type, not part of the spec — see Standards-Referenzen). Tags are **annotated**, format `vX.Y.Z`, on the release commit. Stage release files **explicitly** (never `git add -A`). The `oe5ith-ci` submodule is versioned independently (its own `vX.Y.Z` tags).

**Release checklist:** (1) `npx tsc --noEmit && npm test` green → (2) bump `src/version.ts` → (3) consolidate `CHANGELOG.md` into the `[X.Y.Z]` heading → (4) update the in-app changelog (`GlobalModals.ts`) → (5) `npm run build` → (6) commit `release: vX.Y.Z`, annotated tag `vX.Y.Z`, push commit + tag → (7) deploy with `./deploy-website.sh`.

**Scratch/hygiene:** Keep throwaway scripts, probes and notes out of the repo (e.g. ad-hoc `*.cjs` WebSocket probes, scratch plans). Don't commit files you didn't deliberately create for the change; prefer the gitignored `scratch/` dir or a `*.local.*` name (both ignored) over committing them.

## Working style

These mandates (from `AGENT_INSTRUCTIONS.md` / `GEMINI.md`) have priority in this repo:

- **No independent interpretation:** Execute tasks exactly as requested. Apply surgical, idiomatic changes scoped to the request — don't expand scope or refactor unprompted.
- **Ask when uncertain:** If a requirement is ambiguous, ask rather than guess.
- **Research before fixing:** Map dependencies and reproduce a bug before changing code; include tests with fixes.
- **Verify exhaustively:** Verification before completion is mandatory — see the commands above.
