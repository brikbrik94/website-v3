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

**Aktueller Stand: 1 offener Bug** (Punkt 1, `geodata-updater`).

---

## 1. `layers.py` verwirft `type`/`color`/`opacity`/`legend_items` beim Aggregieren

**Status:** 🔴 Offen — noch nicht als GitHub-Issue gemeldet, siehe Hinweis unten
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

### Warum das trotzdem relevant ist

Falls `layers.py` tatsächlich der produktiv laufende Code ist (z.B. weil ein künftiger
Deploy/Neuinstallation den unveränderten Git-Stand verwendet), würde ein Redeploy die
**aktuell funktionierenden** `type`/`color`/`opacity`/`legend_items`-Felder **entfernen** —
website-v3s gesamte Legenden-Darstellung für Overlay-Layer würde brechen. Das macht dies zu
einem Findings mit hoher Priorität, *bevor* irgendjemand versucht, die neuen v1.1.0-Felder
(Breite, Strichmuster, Umrandung, …) auszurollen — die haben denselben Aggregations-Pfad.

### Vorschlag

`layers.py`s Group-Kopierlogik auf alle in `geodata-plugin-standard` §5.3 spezifizierten Felder
erweitern (mit `.get(..., default)` für Abwärtskompatibilität zu Plugins, die noch nicht auf
v1.1.0 aktualisiert haben).

### Nächster Schritt

**Noch nicht als GitHub-Issue gemeldet** — die Diskrepanz zwischen Code und Live-Verhalten sollte
erst geklärt werden (läuft dort wirklich dieser Code, oder ist unser Checkout nicht der aktuelle
Stand?), bevor wir einen möglicherweise falschen Root-Cause-Vorschlag einreichen.
