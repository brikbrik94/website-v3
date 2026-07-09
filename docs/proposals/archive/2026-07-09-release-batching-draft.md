# Draft: AGENT_INSTRUCTIONS.md §4 — Release-Trigger statt Release-pro-Punkt

## Anlass

`TODO.md` (Abschnitt „UI/UX & Branding") enthielt einen offenen Punkt: Mehrere kleine, an
einem Tag abgeschlossene Punkte führten in der Praxis zu mehreren separaten Releases am selben
Tag (Beispiele aus `CHANGELOG.md`: `3.5.0`/`3.5.1`/`3.5.2` alle am 2026-06-30, `3.6.0`/`3.6.1`
beide am 2026-07-05). Jedes davon durchlief die volle Release-Checkliste (§4, Punkte 2–7:
Versions-Bump, `CHANGELOG.md`-Konsolidierung, In-App-Changelog, Build, Release-Commit+Tag+Push,
Deploy) — für eine einzelne kleine Änderung wirkt das übertrieben.

Rücksprache mit dem Nutzer (2026-07-09) ergab: Der Schmerzpunkt ist ausschließlich der
Release-Overhead, **nicht** die Verifikation. `npx tsc --noEmit && npm test` bleibt nach jeder
Änderung Pflicht (Core Mandate #5) — unverändert, unabhängig vom Release-Zeitpunkt. Gewünscht ist,
die *finalen* Release-Schritte (2–7) über mehrere an einem Tag abgeschlossene Punkte hinweg zu
bündeln, statt pro Punkt einzeln zu releasen.

Zum Trigger befragt (drei Optionen: rein on-demand / Agent schlägt an natürlichen Punkten vor /
feste Kadenz) hat der Nutzer **„Agent schlägt an natürlichen Punkten vor"** gewählt — der Agent
schlägt nach Abschluss eines größeren, in sich geschlossenen Arbeitsblocks aktiv ein Release vor,
ausgeführt wird es erst nach Bestätigung durch den Nutzer.

Das bestehende `[Unreleased]`-Journal-Modell in `CHANGELOG.md` (jede Änderung bekommt sofort einen
eigenen datierten Block, siehe §4 oben) bleibt dabei unverändert — es ist bereits so gebaut, dass
mehrere Blöcke bis zum nächsten Release aufgesammelt werden können. Es fehlte bisher nur die
explizite Regel, dass genau das der Normalfall sein soll, statt nach jedem Block sofort zu
konsolidieren.

## Textänderung

Einfügen in `AGENT_INSTRUCTIONS.md` §4, direkt nach dem bestehenden Absatz zum Versions-Bump
(„**Versions-Bump im Release-Commit selbst** …") und vor „**Commits & Tags:** …":

```markdown
- **Release-Trigger:** Die Release-Checkliste (Punkte 2–7 unten) läuft nicht automatisch nach
  jedem abgeschlossenen TODO-/ROADMAP-Punkt. Änderungen sammeln sich wie gehabt als
  `[Unreleased]`-Journal-Blöcke in `CHANGELOG.md`; nach Abschluss eines größeren, in sich
  geschlossenen Arbeitsblocks (z.B. ein kompletter Sammeltask, mehrere thematisch verwandte
  Punkte) schlägt der Agent aktiv ein Release vor, ausgeführt wird es erst nach Bestätigung.
  **Ausnahme:** akute oder sicherheitsrelevante Fixes können weiterhin sofort einzeln released
  werden, wenn sie nicht bis zum nächsten Batch warten sollten.
```

Keine Änderung an Core Mandate #5 (Verifikation), an der `[Unreleased]`-Journal-Konvention selbst,
oder an den Release-Checkliste-Schritten 1–7 — nur eine neue Regel, *wann* Schritte 2–7 ausgelöst
werden.

## Nicht Teil dieses Proposals

- `TODO.md` „Versionierungspraxis überdenken" wird nach Merge dieses Proposals als erledigt
  markiert und ins `TODO_ARCHIVE.md` verschoben.
- Keine Änderung an den SemVer-Kriterien selbst (patch/minor/major) — die galten schon vor diesem
  Proposal korrekt (jede der Beispiel-Versionen oben war für sich genommen korrekt kategorisiert,
  das Problem war ausschließlich die Release-*Frequenz*).
