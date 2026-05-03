# Design Spec: Dynamische PMTiles Layer-Steuerung (Multi-Accordion)

Dieses Dokument beschreibt die Architektur zur individuellen Steuerung von Vektor-Layern innerhalb von PMTiles-Overlays, basierend auf der CI-konformen Sidebar-Struktur.

## 1. Ziele & Anforderungen
- **CI-Konformität:** Strikte Einhaltung der `oe5ith-ci` Vorgaben für Sidebar und Accordions.
- **Granulare Steuerung:** Jeder Layer eines Overlays (z.B. Stationen, Sektoren, Linien) muss einzeln ein- und ausschaltbar sein.
- **Lazy Loading:** Die Liste der Layer wird erst beim Aufklappen des jeweiligen Akkordeons aus der Style-JSON des Overlays geladen.
- **Ressourcen-Schonung:** Map-Quellen (`sources`) werden erst hinzugefügt, wenn mindestens ein Layer aktiv ist, und entfernt, wenn kein Layer mehr aktiv ist.
- **Nur gewählte Layer:** Das Aktivieren eines Layers schaltet nur diesen sichtbar (kein automatisches "Alle an").

## 2. UI-Komponenten (CI-konform)

### Sidebar (`src/components/Sidebar.ts`)
Die Sidebar wird dahingehend refactored, dass sie für jedes Overlay im Inventar eine eigene `.acc-group` erzeugt.

**Struktur einer `.acc-group`:**
- **Header (`.acc-header`):**
  - `.acc-dot`: Farbiger Indikator (site-spezifisch).
  - `.acc-title`: Anzeigename des Overlays aus dem Inventar.
  - `.acc-status`: Dynamischer Badge (`nicht geladen`, `n Layer`, `alle aktiv`).
  - `.acc-chevron`: Indikator für Klappzustand.
- **Body (`.acc-body`):**
  - `.acc-controls`: Buttons für "Alle an" und "Alle aus".
  - `.acc-item-list`: Dynamisch generierte Liste von `.acc-item` Elementen.
    - `.acc-checkbox`: Ein/Aus Schalter.
    - `.acc-item-label`: Name des spezifischen MapLibre-Layers.

## 3. Datenfluss & Logik

### Initialisierung
1. `MapPage.ts` lädt `inventory.json`.
2. `Sidebar.ts` wird mit der Liste der Overlays initialisiert und erstellt die leeren Akkordeon-Gruppen.

### Lazy Loading der Layer
1. Beim Klick auf den `.acc-header` wird geprüft, ob die Layer-Liste für dieses Overlay bereits geladen wurde.
2. Falls nein: Die Style-JSON des Overlays wird gefetcht.
3. Die `layers` aus der JSON werden extrahiert (gefiltert auf relevante Typen wie `circle`, `line`, `fill`, `symbol`).
4. Die `.acc-item` Elemente werden generiert und in den `.acc-body` injiziert.
5. Die Höhe des Akkordeons wird neu berechnet (`scrollHeight`).

### Layer-Steuerung (Map Interaction)
- **Layer An:** 
  1. Prüfen, ob die `source` des Overlays bereits in MapLibre existiert.
  2. Falls nein: `map.addSource` ausführen.
  3. Layer mit `visibility: 'visible'` hinzufügen (ID-Namespacing beachten: `overlayId-layerId`).
- **Layer Aus:**
  1. `map.setLayoutProperty(id, 'visibility', 'none')` oder Layer komplett entfernen.
  2. Falls dies der letzte aktive Layer des Overlays war: `map.removeSource` (optional zur Performance-Optimierung).

### Status-Synchronisation
- Nach jeder Aktion wird der `.acc-status` Badge im Header aktualisiert:
  - `count === 0` -> `nicht geladen`
  - `0 < count < total` -> `${count} Layer`
  - `count === total` -> `alle aktiv`

## 4. Technische Details
- **Namespacing:** Layer-IDs in MapLibre werden als `${overlayNameSlug}-${layerId}` gespeichert, um Kollisionen zwischen verschiedenen Overlays zu vermeiden.
- **Caching:** Einmal geladene Layer-Listen werden im Speicher der Sidebar-Komponente gehalten.
- **Fehlerbehandlung:** Schlägt der Fetch der Style-JSON fehl, wird eine Fehlermeldung im Akkordeon-Body angezeigt.

## 5. Testkriterien
- [ ] Akkordeons starten eingeklappt und ohne Layer-Liste.
- [ ] Klick auf Header klappt auf und lädt Layer dynamisch nach.
- [ ] Aktivieren eines Layers fügt diesen (und die Source) zur Karte hinzu.
- [ ] "Alle an" aktiviert alle Layer der Gruppe; Badge wechselt auf "alle aktiv".
- [ ] Deaktivieren aller Layer entfernt die Layer (und optional die Source); Badge wechselt auf "nicht geladen".
