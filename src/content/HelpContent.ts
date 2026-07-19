export interface HelpSection {
  heading: string;
  body: string;
}

export interface HelpEntry {
  title: string;
  sections: HelpSection[];
}

export const HELP_CONTENT: Record<string, HelpEntry> = {
  '/karte': {
    title: 'Karte',
    sections: [
      {
        heading: 'Ebenen & Objekte',
        body: 'Über die Legende lassen sich einzelne Kartenebenen ein- und ausblenden. Ein Klick auf eine bereits aktive Ebene in der Legende blendet nur diese wieder aus.'
      },
      {
        heading: 'Erkunden',
        body: 'Ein Klick auf Straßen, Gemeinden, Höhenlinien oder Rettungsdienst-Stationen öffnet ein Infofenster mit den Details des angeklickten Objekts. Über die Seitenleiste lassen sich außerdem Adressen suchen und der eigene Standort anzeigen.'
      }
    ]
  },
  '/routing': {
    title: 'Routing',
    sections: [
      {
        heading: 'Route berechnen',
        body: 'Start- und Zielpunkt werden per Rechtsklick (auf Touch-Geräten durch langes Halten) auf der Karte gesetzt, oder über die Adresssuche. Anschließend wird ein Fahrprofil gewählt und die Route berechnet.'
      },
      {
        heading: 'Ergebnis',
        body: 'Zur berechneten Route gibt es eine ausklappbare Schritt-für-Schritt-Wegbeschreibung mit Abbiege-Symbolen. Über einen Teilen-Link lässt sich die Route inklusive Start, Ziel und Fahrprofil an andere weitergeben.'
      }
    ]
  },
  '/nah': {
    title: 'Luftrettung',
    sections: [
      {
        heading: 'Status auf der Karte',
        body: 'Farbe und Symbol der Marker zeigen die aktuelle Verfügbarkeit der Rettungsdienst-Stützpunkte. Liegen mehrere Hubschrauber am selben Standort, erscheinen sie als ein Marker mit einem Anzahl-Badge.'
      },
      {
        heading: 'Details',
        body: 'Ein Klick auf einen Marker öffnet die Details zu allen Stationen an diesem Standort.'
      }
    ]
  },
  '/coords': {
    title: 'Umrechner',
    sections: [
      {
        heading: 'Formate',
        body: 'Eine Koordinate lässt sich in einem beliebigen Format eingeben — WGS84 (Grad/Minuten/Sekunden), UTM, BMN, MGRS oder Maidenhead — alle anderen Felder aktualisieren sich automatisch.'
      },
      {
        heading: 'Punkt auf der Karte',
        body: 'Ein Rechtsklick (auf Touch-Geräten langes Halten) auf der Karte übernimmt die Koordinate an dieser Stelle. Die Wanderwege-Ebene lässt sich optional dazuschalten.'
      }
    ]
  },
  '/tracking': {
    title: 'Live Tracking',
    sections: [
      {
        heading: 'Live-Daten',
        body: 'Flugzeuge (ADS-B) und Schiffe (AIS) in der Region werden laufend aktualisiert; die Symbole zeigen Kategorie und Kurs.'
      },
      {
        heading: 'Filtern',
        body: 'Über die Auswahl „Alle / ADS-B / AIS" in der Seitenleiste lässt sich die Anzeige auf eine der beiden Quellen eingrenzen.'
      }
    ]
  },
  '/isochrones': {
    title: 'Isochronen',
    sections: [
      {
        heading: 'Punkt & Profil',
        body: 'Ein Punkt wird per Kartenklick, Adresssuche oder manueller Koordinaten-Eingabe gesetzt. Danach werden Fahrprofil sowie die gewünschten Zeit- oder Distanz-Ringe gewählt.'
      },
      {
        heading: 'Ergebnisse verwalten',
        body: 'Mehrere Abfragen lassen sich gleichzeitig anzeigen und über das Augen-Symbol einzeln ein- oder ausblenden — praktisch, um verschiedene Standorte zu vergleichen.'
      }
    ]
  }
};
