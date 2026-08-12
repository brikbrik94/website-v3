# Geodata-Plugin-Standard — Offene Punkte (Übersicht)

Sammel-Einstieg über die aus `website-v3` gemeldeten Punkte gegen
[`geodata-plugin-standard`](../../geodata-plugin-standard/GEODATA_PLUGIN_STANDARD.md) (den
Architektur-/Layer-Metadaten-Standard der `geodata-updater`-Ökosystem-Repos, die die von diesem
Repo konsumierten Tile-Server-Daten erzeugen). Analog zu `docs/ci/open-items.md`.
Vollständig abgeschlossene Anfragen/Handoffs (Detaildatei + dieser Eintrag) wandern nach
`archive/`, sobald nichts mehr website-v3-seitig daran offen ist. `bug-reports.md` bleibt dagegen
dauerhaft hier — es ist die fortlaufende Sammeldatei für künftige Funde, kein einzelner,
abschließbarer Punkt.

## Offen

**Aktuell keine offenen Punkte.**

## Erledigt (archiviert)

**Noch keine.**

---

**Bekannter Zusammenhang mit ROADMAP.md → „Karten-Legende: weitere Optimierung":** Der Standard
(§5 „Layer-Listen-Spezifikation") beschreibt eine `dist/layer-list.json` mit generisch (über
**alle** Templates, nicht nur `anfahrtszeit`) extrahierten `legend_items`/`color`/`opacity` pro
Layer-Gruppe — genau die beiden dort noch offenen Punkte („Kuratierung auf weitere Templates
ausweiten", „`opacity`-Feld für Swatches nutzen"). Ob/wie das zusammenhängt (ist die
website-v3-seitig konsumierte `layers.json` bereits dieses Schema, oder ein älteres/anderes?) ist
nicht Teil dieser Einbindung — noch nicht geprüft, kein aktiver Punkt hier.
