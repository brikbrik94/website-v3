# Copyright-Modal-Erweiterung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das bestehende Copyright-Modal um Kontakt/Impressum, Datenschutz-Hinweis und
vollständige/korrigierte Lizenzangaben erweitern, und den bisher toten Landing-Page-Link
zum Modal reparieren.

**Architecture:** Reines Markup-/Content-Update in zwei bestehenden Dateien
(`src/lib/GlobalModals.ts`, `src/main.ts`) — kein neues Verhalten außer der 1:1-Wiederverwendung
eines bereits an mehreren Stellen genutzten Event-Patterns (`open-copyright`).

**Tech Stack:** Vanilla TypeScript/HTML-Template-Strings, bestehende `oe5ith-ci`-Modal-Klassen
(`.modal-backdrop`, `.modal`, `.modal-header`, `.modal-body`), kein neues CSS.

**Referenz-Spec:** [docs/superpowers/specs/2026-07-07-copyright-modal-design.md](../specs/2026-07-07-copyright-modal-design.md)

## Global Constraints

- Kein neues CSS, keine neuen CI-Komponenten — nur bestehende `<h2>`/`<ul>`/`<p>`/`<a>`-Struktur
  im Modal-Body verwenden.
- Keine devDependencies (`typescript`, `vite`, `vitest`, `concurrently`, `@types/geojson`) in
  der Lizenzliste — nur tatsächlich mit ausgelieferte Runtime-Dependencies.
- Kein Kontaktformular, keine Impressum-Rechtsprüfung, kein `.leaflet-popup-*`-CSS-Cleanup —
  alle drei explizit out of scope laut Spec.
- `npx tsc --noEmit && npm test` muss grün bleiben (reines Markup, keine TS-/Test-Änderung
  erwartet).
- Live-Verifikation (Playwright gegen laufenden Dev-Server) vor Abschluss.

---

### Task 1: Copyright-Modal-Inhalt neu strukturieren

**Files:**
- Modify: `src/lib/GlobalModals.ts:143-169`

**Interfaces:**
- Produces: unverändertes `#copyright-modal`-Element (gleiche ID, gleicher `.modal-backdrop`/
  `.modal`/`.modal-header`/`.modal-body`-Aufbau) — Task 2 verlässt sich darauf, dass
  `open-copyright` weiterhin exakt dieses Element per `classList.add('open')` öffnet
  (unverändert, `GlobalModals.ts:179-181` wird von diesem Task nicht angefasst).

- [ ] **Step 1: Bestehenden Copyright-Modal-Body durch die erweiterte Version ersetzen**

In `src/lib/GlobalModals.ts`, den Block von `<!-- Copyright Modal -->` (Zeile 143) bis zum
schließenden `</div>` des Copyright-Modals (Zeile 169) exakt durch folgenden Block ersetzen:

```html
    <!-- Copyright Modal -->
    <div class="modal-backdrop" id="copyright-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Copyright & Lizenzen</span>
          <button class="modal-close" data-close="copyright-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <h2>Karten & Daten</h2>
          <ul>
            <li><strong>OpenStreetMap:</strong> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a> (ODbL)</li>
            <li><strong>basemap.at:</strong> © <a href="https://basemap.at" target="_blank">basemap.at</a> (CC BY 4.0)</li>
          </ul>

          <h2>Bibliotheken</h2>
          <ul>
            <li><strong>MapLibre GL JS</strong> (BSD-3-Clause)</li>
            <li><strong>proj4</strong> (MIT)</li>
            <li><strong>mgrs</strong> (MIT)</li>
            <li><strong>open-location-code</strong> (Apache-2.0)</li>
            <li><strong>pmtiles</strong> (BSD-3-Clause)</li>
          </ul>

          <h2>Design & Ressourcen</h2>
          <ul>
            <li><strong>Schriftart:</strong> <a href="https://www.jetbrains.com/lp/mono/" target="_blank">JetBrains Mono</a> (OFL 1.1)</li>
            <li><strong>Icons:</strong> <a href="https://fontawesome.com" target="_blank">Font Awesome 6 Free</a> (Icons CC BY 4.0, Schrift OFL 1.1, Code MIT)</li>
          </ul>

          <h2>Kontakt & Impressum</h2>
          <ul>
            <li><strong>Daniel Herbrik</strong></li>
            <li><a href="mailto:daniel@oe5ith.at">daniel@oe5ith.at</a></li>
          </ul>

          <h2>Datenschutz</h2>
          <p>Diese Anwendung verwendet kein Tracking, keine Cookies und keine Analyse-Dienste.
          <code>localStorage</code> wird ausschließlich genutzt, um die zuletzt gewählte
          Basiskarte zu merken — rein lokal im Browser, ohne Übertragung an den Server.
          Anfragen an Routing-, Geocoding- und Tracking-Funktionen laufen über den eigenen
          Server-Proxy und erscheinen dort nur in den Standard-Zugriffslogs, wie bei jedem
          Webserver üblich.</p>

          <h2>Software</h2>
          <p>© 2026 OE5ITH Cloud Services. Alle Rechte vorbehalten.</p>
          <p class="t-tiny t-subtle">Anwendung Version: ${APP_VERSION}</p>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler (reine Template-String-Änderung, `APP_VERSION` bereits importiert
und unverändert verwendet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/GlobalModals.ts
git commit -m "$(cat <<'EOF'
feat(ui): Copyright-Modal um Kontakt/Impressum, Datenschutz und
vollständige Lizenzangaben erweitert

Entfernt die sachlich falsche Leaflet-Angabe (keine Projekt-Abhängigkeit),
ergänzt die bisher fehlenden Runtime-Dependencies (proj4, mgrs,
open-location-code, pmtiles) in einem eigenen Bibliotheken-Abschnitt,
sowie neue Abschnitte Kontakt & Impressum und Datenschutz.
EOF
)"
```

---

### Task 2: Toten Landing-Page-Link beheben + Live-Verifikation

**Files:**
- Modify: `src/main.ts:98`

**Interfaces:**
- Consumes: `open-copyright`-Event (bereits vorhanden, `src/lib/GlobalModals.ts:179-181`,
  unverändert seit Task 1) und das bestehende Muster aus `src/lib/SidebarUtils.ts:15-17`
  (`getSidebarFooterHtml`), das exakt so einen `onclick`-Handler auf ein Element setzt.

- [ ] **Step 1: Footer-Link in `src/main.ts` reparieren**

Zeile 98 (aktuell):

```html
            <a href="#">Lizenzen & Impressum</a>
```

Ersetzen durch:

```html
            <a href="#" onclick="window.dispatchEvent(new CustomEvent('open-copyright'))">Lizenzen & Impressum</a>
```

- [ ] **Step 2: Typecheck + volle Test-Suite**

Run: `npx tsc --noEmit && npm test`
Expected: keine Fehler, alle bestehenden Tests weiterhin grün (keine Testdatei betroffen).

- [ ] **Step 3: Live-Verifikation (Playwright gegen laufenden Dev-Server)**

Dev-Server muss laufen (`npm run dev`, siehe `CLAUDE.md`). Playwright-Skript:
1. Landing-Page (`/`) öffnen, auf „Lizenzen & Impressum" im Footer klicken.
2. Screenshot: Modal „Copyright & Lizenzen" ist sichtbar (Klasse `open` auf
   `#copyright-modal`), zeigt alle sechs Abschnitte in der Reihenfolge Karten & Daten →
   Bibliotheken → Design & Ressourcen → Kontakt & Impressum → Datenschutz → Software.
3. Prüfen, dass der `mailto:`-Link `href="mailto:daniel@oe5ith.at"` korrekt gesetzt ist
   (z.B. via `page.getAttribute` auf das `a`-Element im Kontakt-Abschnitt, nicht per Klick
   auslösen — ein echter `mailto:`-Klick öffnet ein externes Mailprogramm, nicht sinnvoll
   in einer Headless-Umgebung testbar).
4. Modal schließen (Klick auf `.modal-close` oder Backdrop), dann eine Kartenseite öffnen
   (z.B. `/nah`), Sidebar-Footer-©-Button klicken — Regressionstest: bestehender Öffnungsweg
   funktioniert weiterhin identisch.
5. `console --errors`-Äquivalent prüfen (`page.on('pageerror')`/`page.on('console')`
   sammeln): keine Fehler während des gesamten Ablaufs.

Expected: alle fünf Punkte bestätigt, keine Konsolenfehler.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "$(cat <<'EOF'
fix(ui): toten Landing-Page-Link zum Copyright-Modal repariert

"Lizenzen & Impressum" im Footer der Startseite hatte href="#" ohne
Funktion. Öffnet jetzt das Copyright-Modal per open-copyright-Event,
analog zum bestehenden Sidebar-Footer-Muster (SidebarUtils.ts).
EOF
)"
```

## Self-Review (bereits durchgeführt)

- **Spec-Abdeckung:** Modal-Restrukturierung (Task 1: alle sechs Abschnitte, Leaflet-Korrektur,
  vollständige Lizenzliste), Landing-Page-Link-Fix (Task 2) — beide Umsetzungspunkte der Spec
  sind abgedeckt. Out-of-Scope-Punkte (Kontaktformular, Impressum-Rechtsprüfung,
  Leaflet-CSS-Cleanup) werden bewusst nicht in Tasks übersetzt.
- **Placeholder-Scan:** keine TBD/TODO, kein "ähnlich wie Task N" — beide Code-Blöcke sind
  vollständig und exakt.
- **Typ-/Konsistenz-Check:** `#copyright-modal`-ID und `open-copyright`-Event-Name sind in
  Task 1 unverändert gegenüber dem Bestand, Task 2 verlässt sich exakt auf diesen
  unveränderten Namen — kein Drift zwischen den Tasks.
