# Geodata-Plugin-Standard — Offene Punkte (Übersicht)

Sammel-Einstieg über die aus `website-v3` gemeldeten Punkte gegen
[`geodata-plugin-standard`](../../geodata-plugin-standard/GEODATA_PLUGIN_STANDARD.md) (den
Architektur-/Layer-Metadaten-Standard der `geodata-updater`-Ökosystem-Repos, die die von diesem
Repo konsumierten Tile-Server-Daten erzeugen). Analog zu `docs/ci/open-items.md`.

**Workflow (Stand 2026-08-12, gilt ab jetzt auch für `docs/ci/`):** Die vollständige
Änderungsanfrage geht als **GitHub-Issue** direkt an das jeweilige Standard-/Design-System-Repo
(nicht mehr nur als lokale Markdown-Datei) — dadurch lösbar unabhängig davon, auf welchem Gerät
gerade gearbeitet wird. Diese Datei hält nur einen **schlanken Tracking-Eintrag** (Issue-Link +
Kern-Checkliste der angefragten Felder/Verhalten) — kein voller Doppel-Text der Issue-Beschreibung.
Nach jedem Submodul-Update wird die Checkliste gegen den neuen Stand geprüft (z.B. gegen ein neues
`GEODATA_PLUGIN_STANDARD.md` oder eine echte `layers.json`-Antwort) und abgehakt.

Vollständig umgesetzte Punkte wandern nach `archive/`, sobald nichts mehr website-v3-seitig daran
offen ist.

## Offen

### [#1 — Legend-Rendering-Erweiterungen für §5 Layer-Listen-Spezifikation](https://github.com/brikbrik94/geodata-plugin-standard/issues/1)

Gemeldet 2026-08-12. Ziel: Karten-Legende vollständig aus `layer-list.json` speisen können
(Breite, Strichmuster, Umrandung, Icons, geteilte Farbskalen), nicht nur Farbe/Typ/kategorisierte
Werte wie aktuell.

Tracking-Checkliste (pro Feld: prüfen, sobald eine neue Standard-/`layers.json`-Version vorliegt):

- [ ] `width` (Number\|null) — Linienbreite pro Group-Eintrag
- [ ] `dasharray` ([Number,Number]\|null) — Strichmuster pro Group-Eintrag
- [ ] `outline_color` (String\|null) — Umrandung/Casing, Fläche + Linie
- [ ] `outline_width` (Number\|null) — Umrandung/Casing, Fläche + Linie
- [ ] `type: "icon"` + `icon`-Feld (String\|null) — Sprite-Name für echte Icon-Symbol-Layer
- [ ] `legend_scale_id` (String\|null) — Verknüpfung geteilter Farbskalen (z.B. Ski-Schwierigkeitsgrade)
- [ ] Top-Level `legend_sections`-Block (optional, zur Diskussion gestellt — ggf. verworfen)

## Erledigt (archiviert)

**Noch keine.**

---

**Zusammenhang mit ROADMAP.md → „Karten-Legende: weitere Optimierung" (geprüft, 2026-08-12):**
Die live ausgelieferte `tiles.oe5ith.at/layers.json` entspricht bereits strukturell §5 (nur
kleinere Feldnamen-Unterschiede: `layers` statt `styles`, `id`/`pmtiles_url` statt
`style_id`/`pmtiles_path`, kein `original_file`). **`legend_items` deckt bereits 8 Templates ab**
(nicht nur `anfahrtszeit` wie in ROADMAP.md vermerkt) — dieser Teilpunkt ist damit serverseitig
bereits weiter als hier dokumentiert. **`opacity` bleibt ungenutzt** — bestätigt, wird
clientseitig behoben (kein Standard-Bedarf, siehe Issue #1 „Kein Schema-Bedarf"). Das
ursprüngliche Granularitätsproblem (ein Legenden-Eintrag pro Instanz statt pro Kategorie)
besteht für einfarbige Templates ohne `legend_items` weiterhin (z.B. `autobahnen`: 36 Gruppen mit
identischem `color`, `legend_items: null`) — wird clientseitig per Dedup gelöst, kein
Standard-Bedarf.
