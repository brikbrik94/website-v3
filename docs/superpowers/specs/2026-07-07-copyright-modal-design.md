# Credits/Copyright-Modal erweitern — Design

**Status:** Genehmigt
**Datum:** 2026-07-07

## Kontext

TODO.md-Punkt aus dem UI/UX & Branding-Sammeltask (übernommen aus `docs/proposals/todo.txt`,
2026-07-05): das bestehende Copyright-Modal (`src/lib/GlobalModals.ts`, `#copyright-modal`)
soll um eine Kontakt-Mail erweitert und inhaltlich ausgebaut werden.

Bestandsaufnahme des aktuellen Modals ergab zwei Probleme, die mit adressiert werden:

1. **Sachlich falsche Angabe:** Der bestehende Abschnitt „Karten & Daten" listet
   „Bibliotheken: Leaflet (BSD-2), MapLibre GL JS (BSD-3)" — `leaflet` ist keine
   Projekt-Abhängigkeit (fehlt in `package.json`, kein Import im Code). Die einzigen
   Leaflet-Spuren sind ein paar `.leaflet-popup-*`-CSS-Regeln in `src/styles/modal.css`,
   vermutlich Altlast aus einer Zeit vor der Migration auf MapLibre GL — separates
   Cleanup-Thema, nicht Teil dieser Änderung (wird als eigener TODO.md-Punkt dokumentiert).
2. **Unvollständige Lizenzangaben:** Die tatsächlichen Runtime-Dependencies aus `package.json`
   (`mgrs`, `open-location-code`, `pmtiles`, `proj4`) fehlen komplett im Modal. Lizenzen wurden
   aus den jeweiligen `node_modules/*/package.json`-Feldern verifiziert:

   | Paket | Lizenz |
   |---|---|
   | `maplibre-gl` | BSD-3-Clause |
   | `proj4` | MIT |
   | `mgrs` | MIT |
   | `open-location-code` | Apache-2.0 |
   | `pmtiles` | BSD-3-Clause |
   | `@fontsource/jetbrains-mono` | OFL-1.1 |
   | `@fortawesome/fontawesome-free` | CC-BY-4.0 (Icons) / OFL-1.1 (Schrift) / MIT (Code) |

   DevDependencies (`typescript`, `vite`, `vitest`, `concurrently`, `@types/geojson`) werden
   nicht gelistet — sie werden nicht mit ausgeliefert (Build-Tooling only).

Zusätzlich beim Recherchieren gefunden: Der Landing-Page-Footer (`src/main.ts`) hat einen
Link „Lizenzen & Impressum" mit `href="#"` ohne Funktion — im Gegensatz zum
Sidebar-Footer-Muster (`src/lib/SidebarUtils.ts`s `getSidebarFooterHtml`), das per
`onclick` das `open-copyright`-Event dispatcht. Ohne Fix wäre das erweiterte Modal von der
Startseite aus nicht erreichbar.

Für den Datenschutz-Hinweis wurde das tatsächliche Code-Verhalten geprüft: kein
Tracking/Analytics/Cookies im Code (`grep` über `src/` nach `localStorage`, `cookie`,
gängigen Analytics-Bibliotheken); einzige `localStorage`-Nutzung ist
`src/lib/BasemapStore.ts` (merkt die gewählte Basiskarte, rein lokal, keine Übertragung).

## Entscheidungen aus dem Brainstorming

1. **Kontaktmechanismus:** einfacher `mailto:`-Link auf `daniel@oe5ith.at`, kein
   Kontaktformular. Begründung: `api/` ist reiner Read-only-Proxy ohne Mail-Versand-Infra;
   ein echtes Formular bräuchte einen neuen Endpoint, Mail-Versand und Spam-Schutz — deutlich
   größerer Scope als „Modal erweitern". Ein Kontaktformular ist explizit **kein** Teil dieser
   Änderung (könnte als eigener ROADMAP.md-Punkt aufgenommen werden, ist aber nicht Teil dieses
   Auftrags).
2. **Impressum-Angaben:** nur Name (Daniel Herbrik) + Kontakt-Mail. Keine Adresse oder weitere
   Pflichtangaben — der User hat explizit nur diese beiden Angaben freigegeben. **Keine
   Rechtsprüfung**, ob das für die österreichische Impressumspflicht ausreicht — reine
   Umsetzung der vom User freigegebenen Angaben.
3. **Datenschutz-Hinweis:** faktenbasiert auf dem tatsächlichen Code-Verhalten (siehe oben),
   keine spekulativen/generischen Datenschutz-Textbausteine.
4. **Struktur:** alles im selben, bestehenden `#copyright-modal` (kein neues Modal, keine
   Tabs) — passt zum bestehenden `<h2>`-Abschnitts-Muster, keine neue CI-Komponente nötig.
5. **Leaflet-CSS-Cleanup** (`.leaflet-popup-*` in `modal.css`) und ein mögliches
   Kontaktformular sind bewusst **out of scope**, werden nur als TODO.md- bzw.
   ROADMAP.md-Punkt dokumentiert, nicht mitgefixt.

## Umsetzung

### 1. `src/lib/GlobalModals.ts` — Modal-Body neu strukturieren

Der `#copyright-modal`-Body bekommt folgende Abschnittsreihenfolge (ersetzt den
bestehenden Body-Inhalt vollständig):

1. **Karten & Daten** — OSM (ODbL), basemap.at (CC BY 4.0). Die „Bibliotheken:"-Zeile
   entfällt hier (zieht in Abschnitt 2 um).
2. **Bibliotheken** (neu) — MapLibre GL JS (BSD-3-Clause), proj4 (MIT), mgrs (MIT),
   open-location-code (Apache-2.0), pmtiles (BSD-3-Clause).
3. **Design & Ressourcen** — JetBrains Mono (OFL 1.1), Font Awesome 6 Free (präzisiert:
   Icons CC BY 4.0, Schrift OFL 1.1, Code MIT).
4. **Kontakt & Impressum** (neu) — „Daniel Herbrik" +
   `<a href="mailto:daniel@oe5ith.at">daniel@oe5ith.at</a>`.
5. **Datenschutz** (neu) — Fließtext: kein Tracking, keine Cookies, keine Analyse-Dienste;
   `localStorage` nur für die gewählte Basiskarte (lokal, keine Übertragung); Anfragen an
   Routing/Geocoding/Tracking laufen über den eigenen Server-Proxy (Standard-Zugriffslogs).
6. **Software** (unverändert) — Copyright-Zeile + Versionsnummer bleibt am Ende, keine
   inhaltliche Änderung.

Alle neuen Abschnitte nutzen exakt das bestehende Markup-Muster (`<h2>` + `<ul>`/`<p>`),
keine neuen CSS-Klassen.

### 2. `src/main.ts` — toten Footer-Link beheben

Der Landing-Page-Footer-Link „Lizenzen & Impressum" (aktuell `<a href="#">`) bekommt
`onclick="window.dispatchEvent(new CustomEvent('open-copyright'))"`, analog zum
bestehenden Muster in `src/lib/SidebarUtils.ts` (`getSidebarFooterHtml`). Kein
`href="#"` mehr nötig, da der Klick jetzt das Modal öffnet statt zu navigieren — `href`
bleibt zur Barrierefreiheit/als Fallback erhalten (Cursor/Tastatur-Fokus), Event
verhindert nicht das Standard-Verhalten explizit, da `href="#"` ohnehin harmlos ist
(kein Seiten-Reload).

## Error Handling / Edge Cases

Rein statisches HTML-Markup, kein neues Verhalten außer dem Klick-Handler (der exakt das
bestehende, bereits an mehreren Stellen genutzte `open-copyright`-Event-Muster
wiederverwendet) — keine neuen Fehlerfälle.

## Testing

Kein automatisierter Test nötig (statischer Content, kein neues JS-Verhalten außer der
1:1-Wiederverwendung eines bestehenden Event-Patterns). Verifikation erfolgt visuell
(Playwright gegen laufenden Dev-Server):
- Modal von der Landing-Page aus öffnen (vorher toter Link, jetzt funktional).
- Modal vom Sidebar-Footer einer Kartenseite aus öffnen (bestehender Pfad, Regression
  prüfen).
- Alle sechs Abschnitte sichtbar, `mailto:`-Link klickbar (`href` korrekt gesetzt).
- `npx tsc --noEmit && npm test` bleibt grün (keine TS-/Test-Änderung erwartet, reines
  Markup).

## Out of Scope

- Kontaktformular (Backend-Endpoint, Mail-Versand, Spam-Schutz) — möglicher künftiger
  ROADMAP.md-Punkt, nicht Teil dieser Änderung.
- Rechtliche Vollständigkeitsprüfung des Impressums (österreichische
  Impressumspflicht) — reine Umsetzung der vom User freigegebenen Angaben.
- `.leaflet-popup-*`-CSS-Cleanup in `src/styles/modal.css` — separater TODO.md-Punkt.
