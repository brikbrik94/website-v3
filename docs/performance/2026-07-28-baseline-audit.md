# Performance-Baseline-Audit 2026-07-28

Erste Messung der in `CLAUDE.md` als „ungemessen" markierten Core-Web-Vitals-Zielmetriken.
Tooling: `npm run perf:audit` (Lighthouse) + `npm run perf:bundle` (Bundle-Größe), siehe
[docs/superpowers/specs/2026-07-28-perf-audit-tooling-design.md](../superpowers/specs/2026-07-28-perf-audit-tooling-design.md).
Lighthouse-Preset: Default (mobile, simuliertes Throttling) — siehe Spec, „Nicht Teil dieser
Spec" für den bewusst verworfenen Desktop-Vergleichslauf.

## Wichtiger Hinweis zur Methodik

`npm run perf:audit` startet für den Lauf den **Vite-Dev-Server** (`vite`, siehe
`scripts/perf-audit.mjs`), nicht den produktiven `dist/`-Build — das ist eine bewusste
Design-Entscheidung aus Task 3 (programmatischer Start analog zu `npm run dev`), keine
Fehlkonfiguration. Das hat für die Interpretation der Zahlen unten spürbare Konsequenzen:

- Der Dev-Server liefert `maplibre-gl` unminifiziert/ungebündelt aus (`network-requests`-Audit für
  `/karte`: allein `maplibre-gl.js` + `maplibre-gl-shared.mjs` aus `node_modules/.vite/deps/`
  summieren sich auf **~7,3 MB** Transfergröße, bei insgesamt 9,85 MB für die gesamte Seite).
  Dadurch sind **LCP (28,5–34,0 s) und TBT absolut nicht repräsentativ** für das, was Nutzer gegen
  den echten Produktiv-Build erleben — der Produktiv-Bundle (siehe „Bundle-Größe" unten) ist
  bereits minifiziert und liegt für den größten Chunk bei 291 KB gzip statt mehrerer MB unminified.
- Die Lighthouse-„Opportunities" **„Minify JavaScript"** (3,5–4,3 MB geschätzte Ersparnis je Seite)
  und **„Reduce unused JavaScript"** (630–785 KB) sind direkte Folgen davon — sie beschreiben ein
  Dev-Server-Artefakt (unminifizierter, ungebündelter ESM-Graph inkl. Vite-HMR-Client), nicht ein
  reales Produktionsproblem. Beide werden deshalb **bewusst nicht** in die priorisierten Befunde
  unten übernommen.
- Ebenso sind **`is-on-https`/`redirects-http`** (Best-Practices-Audit, auf allen 6 Seiten
  „failed") reine Artefakte des lokalen HTTP-Dev-Servers (`http://100.64.0.1:8000/`) — die
  Produktivseite läuft laut `nginx.conf` über HTTPS. Kein echter Befund, daher ebenfalls nicht in
  der Prioritätsliste.
- Die **relativen** Unterschiede zwischen den 6 Seiten (Accessibility-/Best-Practices-Scores, CLS,
  console-Fehler, Verhältnis der TBT-Werte zueinander) sind dagegen aussagekräftig, da alle 6 Läufe
  unter identischen Bedingungen liefen — diese Deltas bilden die Basis der priorisierten Befunde.
- Ein Wiederholungslauf gegen `vite preview` (echter Produktiv-Build) wäre nötig, um belastbare
  absolute LCP/TBT-Werte zu bekommen — nicht Teil dieser Runde (Tooling-Code ist laut Spec/Task 5
  nicht Gegenstand), als möglicher Folgepunkt in TODO.md vermerkt.

## Scores pro Seite

Alle 6 Seiten wurden erfolgreich auditiert (kein Eintrag mit `error` in `perf-reports/summary.json`).

| Seite | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| /karte | 0.26 | 0.91 | 0.78 | 28.9 s | 0 | 2.850 ms |
| /routing | 0.27 | 0.92 | 0.78 | 31.7 s | 0.063 | 1.990 ms |
| /nah | 0.26 | 0.91 | 0.74 | 29.9 s | 0 | 3.320 ms |
| /coords | 0.26 | 0.82 | 0.78 | 34.0 s | 0 | 3.210 ms |
| /tracking | 0.25 | 0.91 | 0.74 | 28.5 s | 0 | 5.840 ms |
| /isochrones | 0.26 | 0.92 | 0.78 | 31.7 s | 0.063 | 2.050 ms |

(Performance-Score und LCP/TBT-Absolutwerte siehe Methodik-Hinweis oben — als Vergleich
untereinander nutzbar, nicht als Produktionsmaßstab. Accessibility/Best-Practices/CLS sind davon
nicht in gleichem Maß betroffen, da sie überwiegend DOM-/Laufzeitverhalten statt Transfergröße
messen.)

## Bundle-Größe: größte Module

Aus `perf-reports/bundle-stats.json` (Struktur: `tree.children` = ein Knoten pro
Ausgabe-Chunk-Datei, `nodeParts[uid]` liefert `renderedLength`/`gzipLength` je Blattmodul — Top 5
Chunks nach summierter `gzipLength`, produktiver Build via `npm run perf:bundle`):

| Chunk | gzip | rendered (unminifiziert vor gzip) |
|---|---|---|
| `assets/index-*.js` (Haupt-Entry) | 291,59 KB | 1.237,66 KB |
| `assets/CoordsPage-*.js` | 86,84 KB | 258,99 KB |
| `assets/GraphPage-*.js` | 27,84 KB | 104,13 KB |
| `assets/InfoPage-*.js` | 10,49 KB | 38,11 KB |
| `assets/TrackingPage-*.js` | 8,78 KB | 32,59 KB |

Der Haupt-Entry-Chunk dominiert klar alle anderen Chunks. Aufschlüsselung seiner
`node_modules`-Unterbäume zeigt: **`maplibre-gl/dist` allein macht 265,53 KB gzip aus — 91 % des
gesamten Haupt-Chunks** (`pmtiles` 5,61 KB, `fflate` 2,84 KB sind die einzigen weiteren
nennenswerten Bibliotheken darin). Dieser Chunk wird als Vite-Entry **eager** auf jeder Route
geladen: `src/main.ts` importiert `OverlayLoader` statisch (nicht per `import()`), und
`OverlayLoader.ts` importiert seinerseits `maplibre-gl` sowie `MapCore` direkt — dadurch landet
`maplibre-gl` auch im Bundle für `/info/*`, obwohl diese Seiten (laut `CLAUDE.md`: „Modulares
System-Status-Dashboard") keine Karte rendern.

## Priorisierte Befunde

Sortiert nach geschätzter Wirkung (aus den Lighthouse-„Opportunities"/-Diagnostics pro Seite,
dedupliziert wo mehrere Seiten denselben Befund teilen). Dev-Server-Artefakte
(„Minify JavaScript", „Reduce unused JavaScript", `is-on-https`/`redirects-http`) sind laut
Methodik-Hinweis oben bewusst ausgeschlossen. Konkrete Umsetzung ist nicht Teil dieser Runde —
siehe entsprechende TODO.md-Einträge (Step 3).

1. **Fehlende Accessible Names bei Buttons + unzureichender Farbkontrast (global, alle 6
   Seiten).** `button-name`- und `color-contrast`-Audits schlagen auf **allen** 6 auditierten
   Seiten fehl (Accessibility-Score dadurch bei 0,91–0,92 statt 1,0 auf 5 von 6 Seiten). Höchste
   Priorität, da global und WCAG-2.1-AA-relevant (`CLAUDE.md` markiert Accessibility ohnehin als
   „größtenteils ungeprüft").
2. **`/coords`: zusätzliche Formular-Accessibility-Lücken.** Nur auf `/coords` schlagen zusätzlich
   `label` („Formularelemente ohne zugeordnetes Label") und `select-name` („Select-Elemente ohne
   zugeordnetes Label") fehl — erklärt den gegenüber den übrigen 5 Seiten deutlich niedrigeren
   Accessibility-Score (0,82 vs. 0,91–0,92). Seitenspezifisch, vermutlich Koordinaten-Eingabefelder
   bzw. Format-Auswahl.
3. **Kaputte externe Assets (404 gegen `tiles.oe5ith.at`) auf `/nah` und `/tracking`.**
   `errors-in-console`-Audit (reale Browser-Konsolenfehler, kein Heuristik-Artefakt): `/nah` lädt
   die Glyph-Schrift „Open Sans Regular,Arial Unicode MS Regular" (`0-255.pbf`) mit 404; `/tracking`
   lädt das AIS-Sprite (`sprite@2x.png` **und** `sprite@2x.json`) mit 404. Beides sind aktuell
   sichtbar kaputte Assets auf dem Tile-Server, keine reinen Performance-Optimierungen.
4. **`maplibre-gl` wird eager auf jeder Route geladen, auch ohne Karte.** Siehe „Bundle-Größe"
   oben: 265,53 KB gzip (91 % des Haupt-Chunks) landen im Entry-Bundle, weil `src/main.ts` →
   `OverlayLoader.ts` → `MapCore`/`maplibre-gl` statisch statt lazy importiert wird. Betrifft
   potenziell `/info/*` (kein Kartenrendering dort), war aber nicht Teil des 6-Seiten-Audit-Scopes
   — müsste bei Umsetzung eigens verifiziert werden.
5. **`/routing` und `/isochrones`: identischer CLS von 0,063.** Beide Seiten liefern exakt denselben
   `cumulativeLayoutShiftMainFrame`-Wert (0,06318…) — spricht für eine gemeinsame Layout-Shift-Quelle
   in einer geteilten Komponente (beide Seiten nutzen laut Bundle-Analyse `RoutingSidebar`). Niedrige
   Priorität: 0,063 liegt unter der „poor"-Schwelle von 0,1, aber messbar und seitenübergreifend
   reproduzierbar.
6. **`/tracking`: auffällig hoher TBT (5.840 ms) und Mainthread-Arbeit.** Deutlich über den übrigen
   5 Seiten (1.990–3.320 ms). `mainthread-work-breakdown`-Audit zeigt 12,0 s Gesamtarbeit, davon
   9,7 s in der Kategorie „Other" (nicht weiter attribuiert). Relativer Ausreißer innerhalb
   identischer Testbedingungen, Ursache aus den vorliegenden Lighthouse-Daten aber nicht
   abschließend bestimmbar (denkbar: Live-ADS-B/AIS-Verbindungsaufbau) — braucht gezielte
   Nachuntersuchung (z. B. Chrome-Performance-Profil), nicht Teil dieser Runde.

## Rohdaten

Vollständige Lighthouse-JSON/HTML-Reports und `bundle-stats.json`/`bundle-treemap.html` liegen
(gitignored, Wegwerf-Artefakt) unter `perf-reports/` nach einem lokalen Lauf von `npm run
perf:audit` bzw. `npm run perf:bundle`.
