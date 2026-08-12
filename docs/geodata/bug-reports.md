# Geodata-Ökosystem — Sammeldatei

Gefundene Lücken/Bugs/Erweiterungswünsche gegen die beiden Geodata-Submodule, entdeckt beim
Arbeiten in `website-v3`:
- [`geodata-plugin-standard`](../../geodata-plugin-standard/GEODATA_PLUGIN_STANDARD.md) — der
  Architektur-/Layer-Metadaten-**Standard**, den die Plugin-Repos (`geodata-osmdb`, `overlays`, …)
  implementieren sollen.
- [`geodata-updater`](../../geodata-updater/README.md) — die **Pipeline**, die die Plugin-Repos
  orchestriert (`update.sh`/`run.sh` triggern, `dist/manifest.json`/`dist/layer-list.json`
  einsammeln) und zu den unter `tiles.oe5ith.at` ausgelieferten Dateien aggregiert (u.a.
  `scripts/inventory/layers.py` → `layers.json`).

**website-v3 ändert keines der beiden Repos selbst im Submodul** — beide werden extern gepflegt
(analog `oe5ith-ci`/`oe5ith-coding-rules`). Diese Datei dokumentiert Funde für die Übernahme dort
— **pro Eintrag angeben, welches der beiden Repos betroffen ist**, da ein Symptom (z.B. ein
fehlendes Feld in der live ausgelieferten `layers.json`) seine Ursache in *beiden* haben kann: im
Standard selbst (Feld nicht spezifiziert) oder in der Pipeline (Feld spezifiziert, aber beim
Aggregieren verworfen). Sie liegt als normale, committete Datei in diesem Repo
(`docs/geodata/bug-reports.md`), analog zu den `docs/geodata/*-request.md`-Dateien für
Feature-Anfragen und `docs/geodata/handoff-*.md`-Dateien für Handoffs (abgeschlossene
Request-/Handoff-Dateien wandern nach `docs/geodata/archive/`, diese Sammeldatei selbst bleibt
dauerhaft hier).

**Aktueller Stand: 2 offene Punkte** (Punkt 1 behoben; Punkt 2 als Roadmap-Anschluss ohne Issue
offen; Punkt 3 als [geodata-updater#96](https://github.com/brikbrik94/geodata-updater/issues/96)
gemeldet, Tracking dazu in `docs/geodata/open-items.md`).

---

## 1. `layers.py` verwarf `type`/`color`/`opacity`/`legend_items` beim Aggregieren

**Status:** ✅ Behoben in `geodata-updater` Commit `f60eaf0` (2026-08-12, „feat: pass through
legend metadata in layers_info.json") — Root Cause war tatsächlich, dass der Fix zwar auf dem
Server lief, aber nicht ins Repo committet/gepusht war (kein zusätzlicher Verarbeitungsschritt,
wie zunächst vermutet). Submodul-Pointer hier aktualisiert.
**Gemeldet von:** website-v3 (2026-08-12, beim Einbinden von `geodata-updater` als Submodul zum
Nachvollziehen der Pipeline)

### Symptom

`geodata-updater/scripts/inventory/layers.py` (Stand Commit `6df362e`, einzige Änderung an dieser
Datei laut `git log`) kopiert beim Aggregieren der pro Plugin gesammelten `dist/layer-list.json`-
Dateien zu `layers_info.json` pro Group-Eintrag **nur** `source_layer`/`name`/`template`/
`style_layers`:

```python
group = {
    "source_layer": g.get("source_layer"),
    "name": g.get("name"),
    "template": g.get("template"),
    "style_layers": g.get("style_layers", [])
}
```

Alle anderen laut `geodata-plugin-standard` §5.3 spezifizierten Felder (`type`, `color`,
`opacity`, `legend_items`, und seit v1.1.0 auch `width`/`dasharray`/`outline_color`/
`outline_width`/`icon`/`legend_scale_id`) werden **nicht** übernommen — würden bei einem Lauf
dieses Skripts stillschweigend verworfen.

### Root Cause — nicht abschließend geklärt, echter Widerspruch gefunden

Die live unter `https://tiles.oe5ith.at/layers.json` ausgelieferte Datei **hat** aber `type`/
`color`/`opacity`/`legend_items` pro Gruppe (mehrfach in dieser Session gegen echte Daten
verifiziert, website-v3 konsumiert das bereits produktiv, siehe `src/components/Sidebar.ts`).
Das widerspricht dem, was der committete `layers.py`-Code erzeugen würde. Mögliche Erklärungen,
keine davon von uns verifizierbar (kein Server-Zugriff von hier aus):
- Auf dem Server läuft eine lokal gepatchte, nicht committete Version von `layers.py`.
- Es gibt einen weiteren Verarbeitungsschritt zwischen `layers.py` und der öffentlich
  ausgelieferten Datei, den wir in diesem Checkout nicht gefunden haben.

### Warum das relevant war

Da unklar war, ob der committete Code (ohne die 4 Felder) tatsächlich produktiv lief, hätte ein
künftiges Redeploy sonst die aktuell funktionierende Legenden-Darstellung brechen können —
deshalb bewusst noch kein GitHub-Issue eingereicht, bevor die Diskrepanz geklärt war (hätte sonst
einen möglicherweise falschen Root-Cause-Vorschlag enthalten). Nutzer hat den fehlenden Commit
direkt nachgezogen, kein Issue mehr nötig.

---

## 2. `layers.py` reicht die neuen v1.1.0-Felder noch nicht durch

**Status:** 🔴 Offen
**Gemeldet von:** website-v3 (2026-08-12, direkter Anschluss an Punkt 1 — geprüft, nachdem Punkt 1
behoben war)

### Symptom

`layers.py`s Group-Kopierlogik (siehe Punkt 1) übernimmt nach dem Fix `source_layer`/`name`/
`template`/`style_layers`/`type`/`color`/`opacity`/`legend_items` — aber **nicht** die mit
`geodata-plugin-standard` v1.1.0 neu spezifizierten Felder `width`, `dasharray`,
`outline_color`, `outline_width`, `icon`, `legend_scale_id`, und den Top-Level-Block
`legend_sections` (verifiziert: `grep -n "width\|dasharray\|outline\|legend_scale"
scripts/inventory/layers.py` liefert keinen Treffer im aktuellen Stand).

### Root Cause

Naheliegend: Commit `f60eaf0` wurde vor der v1.1.0-Standard-Erweiterung geschrieben (Issue
[geodata-plugin-standard#1](https://github.com/brikbrik94/geodata-plugin-standard/issues/1) kam
zeitlich danach) und deckt entsprechend nur den damaligen Feldstand ab.

### Vorschlag

`layers.py`s Group-Kopierlogik um die 6 neuen Felder ergänzen (mit `.get(field)` → `None`-Default
für Plugins, die ihre `dist/layer-list.json` noch nicht auf v1.1.0 aktualisiert haben) sowie den
neuen Top-Level-Block `legend_sections` aus den Plugin-`layer-list.json`-Dateien einsammeln und
dedupliziert weiterreichen (mehrere Plugins können denselben `legend_scale_id` liefern, siehe
Standard §5.5 „Invariante").

### Nächster Schritt

Noch nicht als GitHub-Issue gemeldet — website-v3-seitig ist die Konsumierung dieser Felder
ohnehin noch nicht gebaut (siehe `docs/geodata/open-items.md` → „Blockiert"), also keine Eile.
Gemeinsam mit der Client-Umsetzung einplanen, dann als ein zusammenhängendes Issue melden.

---

## 3. `layers.py` reicht das Top-Level-Feld `version` nicht durch

**Status:** 🔴 Offen, gemeldet als [geodata-updater#96](https://github.com/brikbrik94/geodata-updater/issues/96)
**Gemeldet von:** website-v3 (2026-08-12, beim Prüfen, ob die für §5.6s Breaking-Change-Regel
nötige `version`-Erkennung überhaupt möglich ist)

### Symptom

`layers.py` liest `data.get("styles", [])` je Plugin-Datei, aber nirgends `data.get("version")` —
das Top-Level-`version`-Feld aus `geodata-plugin-standard` §5.1 fehlt in der aggregierten
Ausgabe komplett.

### Warum das wichtig ist

§5.6 macht `version` zum verbindlichen Signal dafür, ob `legend_items: null` „unkategorisiert"
(alte Bedeutung) oder „Werte liegen in `legend_sections`" (neue, `v1.1`-Bedeutung) heißt. Ohne
`version` in der öffentlichen Datei kann ein Client diesen Unterschied nicht sicher erkennen.

### Offene Designfrage im Issue mitgegeben

`layers.py` aggregiert mehrere Plugin-Dateien mit potenziell unterschiedlichen `version`-Werten
(gestaffeltes Rollout) zu einer Ausgabe — unser Vorschlag im Issue: das Minimum aller
aggregierten Versionen verwenden, damit nie fälschlich neueres Verhalten angenommen wird. Bewusst
nicht selbst entschieden, sondern als offene Frage an `geodata-updater` gestellt.
