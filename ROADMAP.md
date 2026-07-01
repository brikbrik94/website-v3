# Projekt-Roadmap

Neue Features/Funktionen, die es im Code noch nicht gibt — keine Fixes oder Erweiterungen an
bereits bestehenden Features (die gehören in [TODO.md](./TODO.md)). Umgesetzte Punkte wandern
ins [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md).

## Map-Subsystem: Anschlussfeatures (nach dem Cleanup)

Voraussetzung: [Map-Subsystem Cleanup](./TODO.md#map-subsystem-cleanup) abgeschlossen (U1–U7).
Hintergrund/Herleitung: [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](./docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md).

- [ ] **Legende mit Funktion befüllen** — `MapLegend` (`src/lib/`) existiert, zeigt aber noch keine
  echten, pro Seite aktiven Layer an. Ziel: Legende pro Seite dynamisch aus den registrierten
  `MapRegistry`-Layern befüllen, Einträge interaktiv (Toggle-Sichtbarkeit per Klick). Interaktive
  Einträge am ARIA-APG-Pattern für Listbox/Toggle-Buttons orientieren (siehe CLAUDE.md →
  Standards-Referenzen, Accessibility).
- [ ] **Karten-Klick + Overlay-Infos seitenübergreifend** — Klick-auf-Feature-Popups gibt es aktuell
  nur auf der Tracking-Seite (`PopupManager` dort verdrahtet). Ziel: generisches Klick-Handling für
  alle Overlay-Layer (NAH, RD/NEF, Contours/Hiking) mit Popup-Infos, nicht Tracking-spezifisch.
- [ ] **Routing-Kontextmenü: Touchsteuerung** — Das Zielwahl-Kontextmenü in `RoutingPage.ts:76`
  reagiert nur auf Rechtsklick (Desktop). Ziel: Long-Press-Geste als Touch-Äquivalent für
  Tablet/Smartphone. Menüstruktur/Tastaturbedienung am ARIA-APG-Menu-Pattern orientieren (siehe
  CLAUDE.md → Standards-Referenzen, Accessibility).

## Repo-Pflege & Dokumentation

Keine Code-Features im engeren Sinn, aber größere, planbare Initiativen — deshalb hier statt in
TODO.md erfasst. Hintergrund: `CLAUDE.md` referenziert seit 2026-07-01 explizit die Standards
hinter Versionierung/Changelog/Commits/Code-Stil/Geodaten/Accessibility/Security/Performance
(siehe dortige Sektion „Standards-Referenzen"). Kleinere, direkt umsetzbare Angleichungen
(PSR-12-Audit, OWASP-Self-Check) stehen als eigene Punkte in TODO.md, nicht hier.

- [ ] **Bestehende Dokumente an referenzierte Standards angleichen** — `CHANGELOG.md` fehlen die
  Keep-a-Changelog-Kategorien `Deprecated`/`Security` (deutsch: „Veraltet"/„Sicherheit"); prüfen,
  ob sie gebraucht werden und wie sie benannt werden. Den `release: vX.Y.Z` Commit-Typ gegen
  Conventional Commits abgleichen (kein offizieller Typ — entweder dokumentieren warum bewusst
  abweichend, oder auf `chore(release):` umstellen). Danach `TODO_ARCHIVE.md`/`ROADMAP_ARCHIVE.md`
  auf einheitliche, selbstständig lesbare Darstellung prüfen.
- [ ] **`CLAUDE.md` in portable + repo-spezifische Teile aufsplitten** — die repo-unabhängigen,
  standardbasierten Regeln (Versionierung, Changelog, Commits, TODO/Roadmap-Split) in eine
  eigenständige Vorlagendatei auslagern, die 1:1 in andere Repos kopiert werden kann. `CLAUDE.md`
  bleibt eine einzelne Datei für dieses Repo, verweist aber auf die Vorlage statt die Regeln
  erneut auszuformulieren; ergänzt nur noch OE5ITH/website-v3-Spezifisches (Architektur, PHP-API,
  `oe5ith-ci`-Submodule, Sprachregel).
