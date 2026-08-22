# Design: Turn-by-Turn-Parität für Valhalla (Maneuver-Interpreter + CI-Icon-Katalog-Erweiterung)

## Kontext

Der `/routing`-Provider-Umschalter (ORS/Valhalla, siehe
`docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md`) berechnet für Valhalla
bisher nur A→B-Routen ohne Wegbeschreibung: `ValhallaRouteInterpreter.toRouteResult()` liest
ausschließlich `trip.legs[].shape` und `trip.summary.{time,length}`, `trip.legs[].maneuvers[]`
wird komplett ignoriert (nicht mal als Typ deklariert). ORS-Routen zeigen dagegen eine
„Wegbeschreibung"-Disclosure mit Icon+Text pro Schritt
(`RoutingSidebar.ts:347-367` → `RoutingDetailsFormatter.formatSteps()` →
`ManeuverIcons.getManeuverIconMarkup()`).

Dieser Task bringt Valhalla auf Turn-by-Turn-Parität — vollständig, nicht nur für die Fälle, die
sich bequem auf bestehende ORS-Icons abbilden lassen (Nutzer-Entscheidung: „wir sparen hier
nirgends, wir machen das sauber", Konversation 2026-08-22).

## Ist-Zustand: Icon-Quelle

`src/lib/ManeuverIcons.ts` ist bereits 1:1 aus `oe5ith-ci/assets/maneuver-icons/*.svg` (v1.20.0)
übernommen — 14 Icons, gekeyt auf ORS' numerische Manöver-Codes 0–13 (Katalog:
`oe5ith-ci/docs/maneuver-icons.md`). Icons werden dort **lokal inline kopiert**, nicht zur
Laufzeit von `oe5ith-ci` nachgeladen — dasselbe Muster gilt für die 16 neuen Icons dieses Tasks
(siehe „Icon-Beschaffung" unten).

## Valhalla-Manöver-Typen vs. ORS-Katalog

Valhalla liefert 37 numerische Manöver-Typen (`kNone`…`kPostTransitConnectionDestination`,
Quelle: `valhalla-docs/turn-by-turn/api-reference.md`), deutlich granularer als ORS' 14. Vollständig
abgeglichen (Konversation 2026-08-22):

| Valhalla-Typ(en) | `ManeuverKind` | Icon |
| :-- | :-- | :-- |
| `kNone` | — | kein echtes Manöver, nur Fallback-Quelle |
| `kStart` | `depart` | vorhanden |
| `kStartRight` | `depart-right` | **neu** |
| `kStartLeft` | `depart-left` | **neu** |
| `kDestination` | `goal` | vorhanden |
| `kDestinationRight` | `goal-right` | **neu** |
| `kDestinationLeft` | `goal-left` | **neu** |
| `kBecomes` | `becomes` | **neu** |
| `kContinue` | `straight` | vorhanden |
| `kSlightRight` | `slight-right` | vorhanden |
| `kRight` | `turn-right` | vorhanden |
| `kSharpRight` | `sharp-right` | vorhanden |
| `kUturnRight` | `uturn-right` | **neu** |
| `kUturnLeft` | `uturn-left` | **neu** |
| `kSharpLeft` | `sharp-left` | vorhanden |
| `kLeft` | `turn-left` | vorhanden |
| `kSlightLeft` | `slight-left` | vorhanden |
| `kRampStraight` | `ramp-straight` | **neu** |
| `kRampRight` | `ramp-right` | **neu** |
| `kRampLeft` | `ramp-left` | **neu** |
| `kExitRight` | `exit-right` | **neu** |
| `kExitLeft` | `exit-left` | **neu** |
| `kStayStraight` | `stay-straight` | **neu** |
| `kStayRight` | `keep-right` | vorhanden |
| `kStayLeft` | `keep-left` | vorhanden |
| `kMerge` | `merge` | **neu** |
| `kRoundaboutEnter` | `roundabout-enter` | vorhanden |
| `kRoundaboutExit` | `roundabout-exit` | vorhanden |
| `kFerryEnter` | `ferry-enter` | **neu** |
| `kFerryExit` | `ferry-exit` | **neu** |
| `kTransit*` (30–36, 7 Typen) | — | **bewusst ausgeschlossen** |

**Korrektur aus dem Spec-Self-Review:** ORS selbst hat einen **richtungslosen** U-turn-Code (ORS
9, „U-turn") — der bestehende `ci-maneuver-uturn`-Icon bleibt dafür als eigener `ManeuverKind`
`uturn` (bare) erhalten; nur Valhallas `kUturnRight`/`kUturnLeft` bekommen die beiden neuen
gerichteten Varianten. Macht **14 bestehende + 16 neue = 30 `ManeuverKind`-Werte**.

**16 neue Icon-Konzepte.** Uturn/Depart/Goal bekommen bewusst **eigene** Rechts-/Links-Icons statt
sich ein ORS-Icon zu teilen — auch wo (wie bei Depart/Goal) kein Abbiege-Pfeil gezeichnet wird,
sondern ein Punkt+Richtungsindikator (konkrete grafische Umsetzung ist CI-Entscheidung, siehe
„Icon-Beschaffung"). `kBecomes` bekommt ebenfalls ein eigenes Icon, obwohl die Geste ident zu
`straight` ist (Nutzer-Entscheidung: konsequent granular statt zu ökonomisieren).

**Transit-Typen (30–36) bewusst ausgeschlossen** — kein anderer Grund als bei den obigen
Ökonomisierungs-Fragen: `multimodal`/`transit`-Costing ist in dieser Valhalla-Instanz mangels
GTFS-Daten technisch nicht nutzbar (`docs/valhalla-api-guide.md`), keines der unterstützten Profile
(`auto`, `emergency`, `bicycle`, `pedestrian`) kann diese Typen je liefern — Icons dafür wären
totes Gewicht für einen nie erreichbaren Pfad, kein Kompromiss bei der Darstellungsgenauigkeit.

## Architektur-Entscheidung: `RouteStep.type` wird String-basiert

**Ist:** `RouteStep.type: number` (`types/common.ts`) — reiner ORS-Zahlencode, 1:1 aus ORS'
GeoJSON-Response durchgereicht (kein Übersetzungsschritt heute). `ManeuverIcons.getManeuverIconMarkup(orsCode: number)`
ist exakt darauf gekeyt.

**Neu:** `RouteStep.type` wird `ManeuverKind` — ein String-Union-Typ mit den 30 Werten aus obiger
Tabelle (14 bestehende + 16 neue Konzepte, ohne Transit). Grund (Nutzer-Entscheidung
2026-08-22): mit 30 Konzepten ist ein Zahlenschema nicht mehr selbsterklärend, und
`ManeuverKind`-Strings mappen 1:1 auf künftige CI-Icon-IDs (`ci-maneuver-<kind>`). Geprüfter
Impact: `step.type` hat genau **einen** Konsumenten (`RoutingDetailsFormatter.ts:60`), **eine**
Typdefinition (`types/common.ts`), **eine** Icon-Funktion — der Umbau ist klein und lokal begrenzt.

**Konsequenz für den ORS-Pfad:** `RoutingService.calculateRoute()` castet ORS' GeoJSON-Response
aktuell direkt zu `RouteResult` (Zero-Transform). Mit `ManeuverKind` als Ziel-Typ braucht auch der
ORS-Pfad eine (neue, dünne) Übersetzung seiner eigenen numerischen Codes (0–13) in dieselben
`ManeuverKind`-Strings — ORS liefert weiterhin rohe Zahlen, nur der Consumer übersetzt sie jetzt
konsistent zum Valhalla-Pfad.

```text
type ManeuverKind =
  | 'depart' | 'depart-right' | 'depart-left'
  | 'goal' | 'goal-right' | 'goal-left'
  | 'becomes'
  | 'straight'
  | 'slight-right' | 'turn-right' | 'sharp-right'
  | 'slight-left' | 'turn-left' | 'sharp-left'
  | 'uturn' | 'uturn-right' | 'uturn-left'
  | 'ramp-straight' | 'ramp-right' | 'ramp-left'
  | 'exit-right' | 'exit-left'
  | 'stay-straight' | 'keep-right' | 'keep-left'
  | 'merge'
  | 'roundabout-enter' | 'roundabout-exit'
  | 'ferry-enter' | 'ferry-exit';
```

`ManeuverIcons.getManeuverIconMarkup(kind: ManeuverKind): string` ersetzt die bisherige
`orsCode: number`-Signatur; Fallback bei unbekanntem/undefiniertem Wert bleibt `'straight'` (analog
zum bisherigen `FALLBACK_ORS_CODE`-Mechanismus).

**Zwei neue, kleine Übersetzungstabellen:**
- `orsCodeToManeuverKind(code: number): ManeuverKind` — neu, in `RoutingService.ts` oder einem
  neuen kleinen Modul (Entscheidung: eigenes File `src/lib/OrsManeuverKind.ts`, analog zur
  Valhalla-Seite, statt `RoutingService.ts` mit einer fachfremden Zuständigkeit zu belasten —
  „kleine, fokussierte Module"). Vollständige Zuordnung (ORS-Code → `ManeuverKind`, aus
  `oe5ith-ci/docs/maneuver-icons.md` §„ORS-Code-Katalog"):

  | ORS-Code | `ManeuverKind` |
  | :-- | :-- |
  | 0 (Left) | `turn-left` |
  | 1 (Right) | `turn-right` |
  | 2 (Sharp left) | `sharp-left` |
  | 3 (Sharp right) | `sharp-right` |
  | 4 (Slight left) | `slight-left` |
  | 5 (Slight right) | `slight-right` |
  | 6 (Straight) | `straight` |
  | 7 (Enter roundabout) | `roundabout-enter` |
  | 8 (Exit roundabout) | `roundabout-exit` |
  | 9 (U-turn) | `uturn` |
  | 10 (Goal) | `goal` |
  | 11 (Depart) | `depart` |
  | 12 (Keep left) | `keep-left` |
  | 13 (Keep right) | `keep-right` |

- `valhallaTypeToManeuverKind(type: number): ManeuverKind` — neu, in
  `ValhallaRouteInterpreter.ts`, direkt neben der bestehenden `toRouteResult()`-Logik (vollständige
  Zuordnung: siehe Tabelle „Valhalla-Manöver-Typen vs. ORS-Katalog" oben; `kNone` und alle
  Transit-Typen fallen auf `'straight'`).

## Valhalla-Maneuver-Parsing

`ValhallaRouteInterpreter.ts` erweitert `ValhallaLeg`/`ValhallaTrip` um das bisher unbenutzte
`maneuvers[]`-Array (Felder laut `valhalla-docs/turn-by-turn/api-reference.md`):

```text
interface ValhallaManeuver {
  type: number;
  instruction: string;
  street_names?: string[];
  time: number;             // Sekunden
  length: number;           // km (wie trip.summary.length)
  begin_shape_index: number;
  end_shape_index: number;
}
```

`toRouteResult()` mappt jedes `ValhallaManeuver` auf ein `RouteStep`:

| `RouteStep`-Feld | Quelle |
| :-- | :-- |
| `distance` | `maneuver.length * 1000` (km→m, wie beim bestehenden `trip.summary.length`) |
| `duration` | `maneuver.time` (unverändert, Sekunden) |
| `type` | `valhallaTypeToManeuverKind(maneuver.type)` |
| `instruction` | `maneuver.instruction` (Valhalla liefert bereits fertigen Text, keine eigene Text-Generierung nötig — wie bei ORS) |
| `name` | `maneuver.street_names?.[0] ?? ''` |
| `way_points` | `[maneuver.begin_shape_index, maneuver.end_shape_index]` (Index ins bereits dekodierte `shape`, semantisch deckungsgleich mit ORS' `way_points`) |

Alle Maneuver eines Legs bilden `RouteResult.features[0].properties.segments[0].steps[]` — ein
Segment pro Leg (bei A→B mit genau Start/Ziel: ein Leg, ein Segment), analog zu ORS' Struktur.

## Icon-Beschaffung (16 neue Icons)

Folgt demselben Muster wie die bestehenden 14: **lokal inline gezeichnet, nicht blockierend auf
`oe5ith-ci` wartend.**

1. 16 neue SVGs werden nach den bestehenden CI-Stilregeln gezeichnet (`viewBox="0 0 16 16"`,
   `fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`,
   Ausnahmen mit `fill="currentColor"` nur wo nötig — siehe `oe5ith-ci/docs/maneuver-icons.md`)
   und direkt in `MANEUVER_ICON_PATHS` (`ManeuverIcons.ts`) ergänzt, jetzt gekeyt auf
   `ManeuverKind`-Strings statt Zahlen.
2. **Parallel, nicht blockierend:** GitHub-Issue an `brikbrik94/oe5ith-ci` mit den 16 SVGs als
   konkreter Vorschlag (Kontext: Valhalla-Manöver-Granularität, Motivation, vorgeschlagene
   `icons.json`-Schema-Erweiterung — `orsCode` als Kopplungsschlüssel reicht nicht mehr, da 16 der
   30 Konzepte keinen ORS-Code haben; Vorschlag: zusätzliches/alternatives `id`-Feld, das
   provider-neutral ist). **Die exakte grafische Umsetzung (insbesondere Depart-/Goal-Richtungs-
   varianten: Punkt+Pfeil wie vom Nutzer skizziert) bleibt CI-Entscheidung**, dieses Repo schlägt
   nur vor.
3. Tracking-Eintrag in `docs/ci/open-items.md` (Issue-Link + kompakte Checkliste der 16
   angefragten Icons), nach Repo-Konvention.
4. Sobald `oe5ith-ci` die Icons offiziell aufnimmt (ggf. mit Form-Anpassungen): kleines
   Folge-Update, das die lokalen Inline-Kopien gegen den offiziellen Stand synchronisiert —
   **nicht** Teil dieses Tasks/Plans.

## Testing-Strategie

- `OrsManeuverKind.test.ts` (neu): alle 14 ORS-Codes → korrekter `ManeuverKind`, unbekannter Code
  → `'straight'`-Fallback.
- `ValhallaRouteInterpreter.test.ts` (erweitern, Datei existiert bereits für `toRouteResult()`):
  alle 30 gemappten Valhalla-Typen → korrekter `ManeuverKind` (Tabellen-getriebener Test), die 7
  Transit-Typen → `'straight'`-Fallback (kein Crash, falls doch mal geliefert), `maneuvers[]` →
  korrekt befüllte `RouteStep[]` (distance/duration/type/instruction/name/way_points), km→m-
  Umrechnung geprüft.
- `ManeuverIcons.test.ts` (neu oder erweitert, falls schon vorhanden — prüfen): jedes der 30
  `ManeuverKind`-Werte liefert ein nicht-leeres SVG-Markup, unbekannter/`undefined`-Wert fällt auf
  `'straight'` zurück.
- `RoutingDetailsFormatter.test.ts`/`RoutingSidebar.test.ts`: bestehende Turn-by-Turn-Tests
  (`formatSteps`, Disclosure-Rendering) bleiben grün mit dem neuen String-`type` — ggf. Test-
  Fixtures von numerischen auf String-`type`-Werte umstellen (bestehende Tests nutzen
  `type: 11`/`type: 6`, siehe `RoutingSidebar.test.ts:121-122`).

## Live-Verifikation

Playwright gegen den Dev-Server: `/routing`, A→B, Provider Valhalla, echte Start/Ziel-Koordinaten
in Oberösterreich — Wegbeschreibung erscheint mit Icons+Text, mindestens ein Schritt mit einem der
neuen `ManeuverKind`-Werte (falls die Testroute keinen Ramp/Exit/Merge enthält: gezielt eine Route
über eine Autobahnauf-/-abfahrt wählen, damit mindestens ein neues Icon real durchläuft, nicht nur
per Unit-Test). Kein Konsolenfehler, Icons rendern sichtbar (nicht nur „kein Crash").

## Nicht Teil dieses Tasks

- SEW/NEF-Matrix-Parität für Valhalla (eigenes Teilprojekt, siehe Brainstorming-Historie).
- Tatsächliche Umsetzung/Merge der 16 Icons in `oe5ith-ci` selbst — dieses Repo liefert nur den
  Vorschlag (Issue), nicht die Umsetzung dort.
- Rückwirkende Anpassung, falls `oe5ith-ci` andere Icon-IDs/Formen wählt als hier lokal
  vorgeschlagen — Folge-Sync-Task nach CI-Merge.
