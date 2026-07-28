# Lokales Performance-Audit-Tooling (Lighthouse + Bundle-Analyse)

**Kontext:** `CLAUDE.md` nennt Core Web Vitals (LCP, INP, CLS) als Zielmetriken, markiert sie aber
als „ungemessen". Bisher fehlte dafür eine lokal lauffähige Testumgebung — mehrere TODO.md-Einträge
notieren „keine Playwright-Umgebung hier". Das stimmt in dieser Session nachweislich nicht mehr: ein
gecachter Chromium-Build liegt bereits unter `~/.cache/ms-playwright/` (passend zu
`playwright@1.62.0`), Netzwerkzugriff auf `tiles.oe5ith.at`/`api.oe5ith.at` funktioniert,
`api/config.local.php` ist vorhanden — ein per Playwright gesteuerter `npm run dev`-Durchlauf gegen
`/karte` wurde bereits smoke-getestet (echtes `networkidle`, keine Konsolenfehler, echte
`performance`-Timings). Ziel dieser Runde: aus diesem Befund ein wiederholbares, committetes
Repo-Tool machen. **Kein Teil dieser Runde:** tatsächliche Code-Optimierungen — Ergebnis ist ein
Befund-Report, priorisierte Maßnahmen werden danach als eigene TODO.md-Einträge erfasst.

## Entscheidung 1: Lighthouse statt eigener Web-Vitals-Sammlung

Playwrights bereits gecachter Chromium wird über `CHROME_PATH` an `lighthouse` (npm-Paket, bringt
`chrome-launcher` mit) durchgereicht. Lighthouse liefert automatisch nicht nur die Zielmetriken
(LCP, CLS, TBT als INP-Näherung, FCP), sondern auch priorisierte „Opportunities"/„Diagnostics"
(z.B. unused JavaScript, render-blocking resources, Bildgrößen) — das macht aus rohen Zahlen einen
tatsächlich priorisierbaren Befund-Report, was der eigentliche Zweck dieser Runde ist. Eine eigene
Web-Vitals-Sammlung (Alternative, verworfen) hätte präzisere Rohwerte, aber keine automatischen
Optimierungsvorschläge — die müssten dann manuell aus Rohdaten abgeleitet werden.

**Lighthouse-Kategorien:** `performance`, `accessibility`, `best-practices`. Accessibility ist laut
`CLAUDE.md` „größtenteils ungeprüft" — kostenloser Zusatznutzen im selben Lauf, keine SEO-Kategorie
(nicht relevant für eine App hinter Login-losem, aber suchmaschinen-irrelevantem Kartenclient).

## Entscheidung 2: Neue devDependencies

`playwright`, `lighthouse`, `rollup-plugin-visualizer`. Alle drei rein für Entwicklungs-/Audit-Zwecke,
kein Einfluss auf `dist/`-Bundle zur Laufzeit (Vite-Plugin ist Build-Zeit-only).

## Entscheidung 3: Zwei getrennte npm-Scripts

- **`npm run perf:audit`** → `scripts/perf-audit.mjs`. Startet Vite (`vite`) und den PHP-Dev-Server
  (`php -S 127.0.0.1:8081 router.php`) intern als Child-Prozesse (analog zu `dev`/`dev:api`, aber
  programmatisch statt über `concurrently`, damit das Skript den Serverstart selbst abwarten und am
  Ende sauber beenden kann), pollt `http://100.64.0.1:8000/` bis erreichbar (Timeout 15s, danach
  Abbruch mit klarer Fehlermeldung), fährt dann Lighthouse nacheinander gegen alle 6 Kartenseiten:
  `/karte`, `/routing`, `/nah`, `/coords`, `/tracking`, `/isochrones`. Danach werden beide
  Kind-Prozesse beendet (auch bei Fehlern/Abbruch — `try`/`finally`).
- **`npm run perf:bundle`** → `ANALYZE=true vite build`. `vite.config.ts` bindet
  `rollup-plugin-visualizer` nur ein, wenn `process.env.ANALYZE` gesetzt ist (kein Overhead im
  normalen `npm run build`). Schreibt eine interaktive Treemap-HTML, kein Server nötig.

## Entscheidung 4: Output-Ablage — roh vs. kuratiert

Rohe Lighthouse-JSON/HTML-Reports und die Bundle-Treemap landen in `perf-reports/` (neu, **in
`.gitignore` aufgenommen**) — das sind Wegwerf-Artefakte pro Lauf, analog zur bestehenden
Scratch-Konvention (`AGENT_INSTRUCTIONS.md` §4, „Scratch/Hygiene"), werden nicht committed.

Die **kuratierte Zusammenfassung** (Score-Tabelle pro Seite/Kategorie + priorisierte Befundliste,
von mir nach dem ersten Lauf von Hand geschrieben, nicht automatisch generiert) kommt stattdessen
nach `docs/performance/2026-07-28-baseline-audit.md` — das *wird* committed, analog zu
`docs/security/owasp-top10-checklist.md`. Neues Verzeichnis `docs/performance/` für künftige
Wiederholungsläufe (z.B. nach größeren Änderungen, als Regressionscheck).

## Entscheidung 5: Fehlerbehandlung pro Seite

Schlägt Lighthouse für eine einzelne Seite fehl (z.B. Backend/Tile-Server nicht erreichbar,
Navigation-Timeout), bricht **nicht** der gesamte Lauf ab — der Fehler wird geloggt und im
Abschluss-Report als „Seite X: Audit fehlgeschlagen ({Grund})" vermerkt, die übrigen Seiten laufen
regulär weiter. Erst wenn *keine* einzige Seite audit-fähig ist (z.B. Server startet gar nicht),
bricht das Skript mit Exit-Code ≠ 0 ab.

## Nicht Teil dieser Spec

- **Tatsächliche Code-Optimierungen** — Ergebnis dieser Runde ist ausschließlich Tooling + Report;
  Umsetzung ist ein späterer, separat zu planender Schritt (priorisierte Befunde landen als neue
  TODO.md-Einträge).
- **Mobile-Preset/Throttling-Vergleich** — Lighthouse läuft mit Default-Preset (mobile,
  simuliertes Throttling); ein separater Desktop-Vergleichslauf ist kein Teil dieser Runde, kann
  bei Bedarf als Folgepunkt ergänzt werden.
- **CI-Integration** (automatischer Lighthouse-Lauf in `.github/workflows/ci.yml`) — bewusst
  verworfen für diese Runde, da noch keine Baseline/Schwellenwerte existieren, gegen die ein
  CI-Gate sinnvoll prüfen könnte.
- **`/info/*`-Seiten** — Scope ist auf die 6 Kartenseiten begrenzt (Nutzer-Entscheidung beim
  Brainstorming).
