# Seiten-Hilfe (Topbar-Button + Modal) — Design

**Status:** entworfen, freigegeben durch Nutzer (2026-07-19) — Implementierung offen.
**Herkunft:** `docs/TODO.md` → „Neue Seiten (nächste Schritte)" → „Hilfeseite".

## Ziel

Kontextbezogene Kurzhilfe pro Kartenseite, erreichbar über einen runden „?"-Button in der
Topbar (gleiche Optik wie der bestehende Legende-Button). Klick öffnet ein Modal mit 2 kurzen
Abschnitten, die erklären, wie die aktuell offene Seite bedient wird — kein Seitenwechsel nötig,
kein Scrollen. Ersetzt die ursprüngliche TODO.md-Idee einer eigenen `/hilfe`-Route: eine
kontextbezogene Lösung passt besser zum bestehenden Modal-Infrastruktur-Muster
(Changelog/Copyright in `GlobalModals.ts`) und beantwortet „wie funktioniert *diese* Seite"
direkter als eine separate Übersichtsseite, die man extra ansteuern müsste.

**Scope:** Nur die 6 Kartenseiten mit eigenem `PageController` (`/karte`, `/routing`, `/nah`,
`/coords`, `/tracking`, `/isochrones`). Landing-Page (hat bereits die beschreibenden Karten im
`.card-grid`) und Info-Portal (`/info/*`, selbst schon ein Doku-/Status-Bereich) bekommen **keinen**
Hilfe-Button.

## Architektur

Drei kleine, fokussierte Bausteine statt einer großen Erweiterung:

1. **`src/content/HelpContent.ts`** (neu) — reine Daten, kein UI-Code. Exportiert
   `HELP_CONTENT: Record<string, HelpEntry>`, keyed nach kanonischem Seitenpfad. Ob eine Seite
   Hilfe hat, entscheidet sich rein dadurch, ob ein Eintrag existiert — kein zusätzliches Flag,
   spätere Seiten sind einfach ein neuer Eintrag.
2. **`src/lib/GlobalModals.ts`** (erweitert) — ein generisches `#help-modal`, analog zu
   Changelog/Copyright. Der Body wird bei jedem `open-help`-Event live aus
   `HELP_CONTENT[window.location.pathname]` befüllt. Kein neuer Modal-Typ, keine neue CSS-Datei —
   nutzt die schon vorhandenen `.modal-body h2/h3/p`-Regeln aus `modal.css`.
3. **`src/components/Topbar.ts`** (erweitert) — ein `.btn-help`-Button direkt neben `.btn-legend`,
   sowohl im Desktop-`controls-panel` als auch im mobilen `controls-overlay`-Block. Identisches
   Markup-Muster wie die Legende (`topbar-toggle topbar-toggle--icon-only`, `data-tooltip="Hilfe"`,
   `fa-solid fa-circle-question`) — 1:1 wiederverwendete Optik/Tooltip-Mechanik, keine neue CSS
   nötig. Gerendert nur, wenn `HELP_CONTENT[currentPath]` existiert (aktuell deckungsgleich mit
   `hasMap`, aber robuster falls künftig eine Kartenseite ohne Hilfe-Content dazukommt). Klick
   dispatcht nur `window.dispatchEvent(new CustomEvent('open-help'))` — kein Payload, exakt wie
   der bestehende Copyright-Link; `GlobalModals.ts` liest den Pfad selbst.

**Bewusst nicht:** ein Modal pro Seite in den 6 Page-Controllern selbst (dupliziert die
bestehende, funktionierende Modal-Infrastruktur ohne Vorteil), und nicht in `TopbarNav.ts`
(Icon-Only-Stil ist an `.controls-panel`/`.controls-overlay` als Elternkontext gebunden, siehe CSS
unten — `TopbarNav.ts` wird auf der Landing-Page mitgerendert, wo der Button nicht erscheinen soll).

## Dateistruktur

- `src/content/HelpContent.ts` — neu, Daten + Interfaces
- `src/content/HelpContent.test.ts` — neu, Tests
- `src/lib/GlobalModals.ts` — erweitert (neues Modal-Markup + Event-Listener)
- `src/components/Topbar.ts` — erweitert (Button-Markup ×2 Stellen + Klick-Listener)

Keine neue Route, kein neuer PHP-Endpoint, keine neue CSS-Datei.

## Datenmodell & Datenfluss

```ts
// src/content/HelpContent.ts
export interface HelpSection { heading: string; body: string; }
export interface HelpEntry { title: string; sections: HelpSection[]; }

export const HELP_CONTENT: Record<string, HelpEntry> = {
  '/karte': { title: 'Karte', sections: [...] },
  '/routing': { title: 'Routing', sections: [...] },
  '/nah': { title: 'Luftrettung', sections: [...] },
  '/coords': { title: 'Umrechner', sections: [...] },
  '/tracking': { title: 'Live Tracking', sections: [...] },
  '/isochrones': { title: 'Isochronen', sections: [...] },
};
```

**`Topbar.ts`:** `currentPath` wird dort bereits berechnet (`window.location.pathname`). Neue
Konstante `const helpEntry = HELP_CONTENT[currentPath];`, Button-Markup nur gerendert wenn
`helpEntry` truthy — analog zu `hasMap ? ... : ''`. Listener-Registrierung im bestehenden
`if (hasMap) { ... }`-Init-Block, neben Legend-Toggle/CustomActions-Wiring:

```ts
document.querySelectorAll('.btn-help').forEach((btn) => {
  btn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-help')));
});
```

Kein Active-State-Tracking nötig (anders als Legende/CustomActions) — der Button öffnet nur ein
transientes Modal, kein Toggle-Zustand.

**`GlobalModals.ts`:** neues Markup analog zu `#changelog-modal`/`#copyright-modal`:

```html
<div class="modal-backdrop" id="help-modal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="help-modal-title"></span>
      <button class="modal-close" data-close="help-modal"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body" id="help-modal-body"></div>
  </div>
</div>
```

Listener:

```ts
window.addEventListener('open-help', () => {
  const entry = HELP_CONTENT[window.location.pathname];
  if (!entry) return; // defensiv, sollte durch Topbar-Gating nie eintreten
  document.getElementById('help-modal-title')!.textContent = entry.title;
  document.getElementById('help-modal-body')!.innerHTML = entry.sections
    .map((s) => `<h3>${s.heading}</h3><p>${s.body}</p>`).join('');
  document.getElementById('help-modal')?.classList.add('open');
});
```

Schließen (Backdrop-Klick, X-Button) läuft automatisch über die schon vorhandene generische
Delegation in `GlobalModals.ts` (`mount.addEventListener('click', ...)`) — keine neue Logik.

## Content (final, freigegeben durch Nutzer)

Tiefe: „mittel" — pro Seite 2 kurze Abschnitte mit Überschrift, je 2–3 Sätze.

**Karte** (`/karte`)
- *Ebenen & Objekte*: „Über die Legende lassen sich einzelne Kartenebenen ein- und ausblenden.
  Ein Klick auf eine bereits aktive Ebene in der Legende blendet nur diese wieder aus."
- *Erkunden*: „Ein Klick auf Straßen, Gemeinden, Höhenlinien oder Rettungsdienst-Stationen öffnet
  ein Infofenster mit den Details des angeklickten Objekts. Über die Seitenleiste lassen sich
  außerdem Adressen suchen und der eigene Standort anzeigen."

**Routing** (`/routing`)
- *Route berechnen*: „Start- und Zielpunkt werden per Rechtsklick (auf Touch-Geräten durch langes
  Halten) auf der Karte gesetzt, oder über die Adresssuche. Anschließend wird ein Fahrprofil
  gewählt und die Route berechnet."
- *Ergebnis*: „Zur berechneten Route gibt es eine ausklappbare Schritt-für-Schritt-Wegbeschreibung
  mit Abbiege-Symbolen. Über einen Teilen-Link lässt sich die Route inklusive Start, Ziel und
  Fahrprofil an andere weitergeben."

**Luftrettung** (`/nah`)
- *Status auf der Karte*: „Farbe und Symbol der Marker zeigen die aktuelle Verfügbarkeit der
  Rettungsdienst-Stützpunkte. Liegen mehrere Hubschrauber am selben Standort, erscheinen sie als
  ein Marker mit einem Anzahl-Badge."
- *Details*: „Ein Klick auf einen Marker öffnet die Details zu allen Stationen an diesem
  Standort."

**Umrechner** (`/coords`)
- *Formate*: „Eine Koordinate lässt sich in einem beliebigen Format eingeben — WGS84
  (Grad/Minuten/Sekunden), UTM, BMN, MGRS oder Maidenhead — alle anderen Felder aktualisieren sich
  automatisch."
- *Punkt auf der Karte*: „Ein Rechtsklick (auf Touch-Geräten langes Halten) auf der Karte
  übernimmt die Koordinate an dieser Stelle. Die Wanderwege-Ebene lässt sich optional
  dazuschalten."

**Live Tracking** (`/tracking`)
- *Live-Daten*: „Flugzeuge (ADS-B) und Schiffe (AIS) in der Region werden laufend aktualisiert;
  die Symbole zeigen Kategorie und Kurs."
- *Filtern*: „Über die Auswahl „Alle / ADS-B / AIS" in der Seitenleiste lässt sich die Anzeige auf
  eine der beiden Quellen eingrenzen."

**Isochronen** (`/isochrones`)
- *Punkt & Profil*: „Ein Punkt wird per Kartenklick, Adresssuche oder manueller
  Koordinaten-Eingabe gesetzt. Danach werden Fahrprofil sowie die gewünschten Zeit- oder
  Distanz-Ringe gewählt."
- *Ergebnisse verwalten*: „Mehrere Abfragen lassen sich gleichzeitig anzeigen und über das
  Augen-Symbol einzeln ein- oder ausblenden — praktisch, um verschiedene Standorte zu
  vergleichen."

## Fehlerbehandlung & Edge Cases

- Kein `HELP_CONTENT`-Eintrag für den aktuellen Pfad → Button wird gar nicht gerendert (Gating in
  `Topbar.ts`); der Listener in `GlobalModals.ts` hat zusätzlich einen defensiven Early-Return,
  falls das Event trotzdem einmal ohne Button-Klick ausgelöst würde.
- Body-Inhalt kommt ausschließlich aus dem eigenen, statischen `HelpContent.ts` (keine
  Nutzereingabe, kein Remote-Content) — `innerHTML`-Zuweisung ist hier unkritisch, analog zum
  bestehenden Changelog-Modal-Muster.
- Modal-Zustand ist rein DOM-lokal (`.open`-Klasse), überlebt SPA-Navigation wie
  Changelog/Copyright-Modal auch schon — kein neues Verhalten, keine Regression.
- `/isochronen`-Alias: `IsochronesPageController` normalisiert den Pfad bereits per
  `history.replaceState` auf `/isochrones`, bevor `Topbar.ts` rendert — `HELP_CONTENT` braucht
  daher nur den kanonischen Pfad, keinen Alias-Eintrag.

## Tests

- `HelpContent.test.ts` — jeder der 6 erwarteten Pfade hat einen Eintrag, jeder Eintrag hat
  `title` + mindestens 1 `section`, jede Section hat nicht-leere `heading`/`body`.
- Kein Playwright/Browser hier verfügbar (bekannte Repo-Einschränkung) — Live-Verifikation
  (Button-Platzierung Desktop/Mobile, Modal-Optik, Backdrop-Klick) durch den Nutzer nach
  Implementierung, wie bei allen vorherigen Karten-Features.

## Out of Scope (bewusst nicht Teil dieser Iteration)

- Eigene `/hilfe`-Übersichtsseite (siehe „Ziel" — bewusst durch den kontextbezogenen Ansatz
  ersetzt, kein Parallelbetrieb beider Varianten).
- Hilfe-Button auf Landing-Page oder Info-Portal-Modulen.
- Tastatur-Shortcut zum Öffnen (z.B. `?`-Taste) — kein genannter Bedarf, eigener Folgepunkt bei
  Bedarf.
- Mehrsprachigkeit — Content ist wie der Rest der App auf Deutsch.
