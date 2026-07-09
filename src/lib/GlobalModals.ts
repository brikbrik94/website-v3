import { APP_VERSION } from '../version';

/**
 * GlobalModals - Zentrales Management für Changelog und Copyright Modals.
 * Wird einmalig in main.ts initialisiert.
 */
export const initGlobalModals = () => {
  if (document.getElementById('global-modals-mount')) return;

  const mount = document.createElement('div');
  mount.id = 'global-modals-mount';
  mount.innerHTML = `
    <!-- Changelog Modal -->
    <div class="modal-backdrop" id="changelog-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Changelog</span>
          <button class="modal-close" data-close="changelog-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" id="changelog-modal-body">
          <h2>[3.8.0] - 2026-07-09</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Luftrettung (NAH):</strong> Stützpunkte mit mehreren Hubschraubern am selben Standort (z.B. Christophorus 14/99) werden jetzt als ein Marker mit Anzahl-Badge dargestellt, dessen Farbe den besten Status aller dortigen Maschinen zeigt. Ein Klick öffnet die Details zu allen Stationen an diesem Standort.</li>
          </ul>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Mobile Ansicht:</strong> Das OE5ITH-Logo in der oberen Leiste war auf Mobilgeräten unsichtbar — wird jetzt wieder angezeigt.</li>
            <li><strong>Kartenseiten (Tablet):</strong> Bei mittleren Bildschirmbreiten fehlte auf Kartenseiten einer der beiden Schnellzugriffs-Links („Luftrettung") — beide sind jetzt sichtbar.</li>
          </ul>

          <h2>[3.7.0] - 2026-07-07</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Routing:</strong> Bei berechneten A→B-Routen gibt es jetzt eine ausklappbare Wegbeschreibung mit Schritt-für-Schritt-Anweisungen auf Deutsch inklusive Abbiege-Symbolen.</li>
            <li><strong>Rechtliches:</strong> Das Lizenz-/Copyright-Fenster wurde erweitert um Kontaktdaten/Impressum, Datenschutzhinweise und eine vollständige Auflistung der verwendeten Bibliotheken.</li>
          </ul>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Mobile Navigation:</strong> Auf kleinen Bildschirmen sind jetzt wieder alle 5 Hauptbereiche (Routing, Luftrettung, Karte, Umrechner, Tracking) über die obere Leiste erreichbar.</li>
            <li><strong>Luftrettung (NAH):</strong> Beim Wechsel auf eine andere Station/ein anderes Flugzeug erscheint das neue Popup jetzt sofort, statt sich erst zu schließen.</li>
            <li><strong>Luftrettung (NAH):</strong> Klick auf eine außerhalb der Saison inaktive Station führte zu einem Fehler statt einer korrekten Anzeige — behoben.</li>
            <li><strong>Karte:</strong> Lange Warnhinweis-Texte in der Seitenleiste (z.B. Zufahrtsbeschränkungen) werden jetzt korrekt umgebrochen statt abgeschnitten.</li>
            <li><strong>Karte:</strong> Diverse kleinere Darstellungs- und Stabilitätskorrekturen (Track-Linienbreite, Terrain-Laden, Hover-Cursor bei Schiffs-/Flugzeugsymbolen).</li>
          </ul>

          <h2>[3.6.1] - 2026-07-05</h2>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Umrechner:</strong> Punkt auf der Karte setzen läuft jetzt über ein Rechtsklick-Menü statt über einen einfachen Klick, damit Linksklick zum Verschieben der Karte frei bleibt.</li>
            <li><strong>Versionsinfo-/Copyright-Fenster:</strong> wurde teilweise von der oberen Leiste verdeckt — behoben.</li>
            <li><strong>Routing:</strong> Bei einer A→B-Route erschien fälschlich eine leere Liste „Nächste Stützpunkte" — wird jetzt nicht mehr angezeigt.</li>
            <li><strong>Allgemein:</strong> Die Anwendung heißt jetzt „GeoPortal" statt „Cloud Portal".</li>
          </ul>

          <h2>[3.6.0] - 2026-07-05</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Routing:</strong> Bei berechneten A→B-Routen zeigt die Zusammenfassung jetzt ein Symbol für den Fahrmodus (Auto bzw. Blaulichtfahrt) sowie Warnhinweise, wenn die Route Mautstraßen oder Zufahrtsbeschränkungen enthält.</li>
          </ul>

          <h2>[3.5.2] - 2026-06-30</h2>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Karte:</strong> Stabileres und schnelleres Verhalten beim Wechsel der Hintergrundkarte (Overlays und Symbole werden nicht mehr doppelt geladen).</li>
            <li><strong>Höhenlinien & Overlays:</strong> Zuverlässigeres Ein-/Ausschalten; aktivierte Karten-Effekte „wandern" nicht mehr ungewollt auf andere Seiten.</li>
          </ul>

          <h2>[3.5.0] - 2026-06-30</h2>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Karten-Symbole:</strong> Einsatzort- und Koordinaten-Marker nutzen jetzt das einheitliche CI-Standortsymbol; Pins für Routing und Stationen stammen aus dem CI-Symbolsatz.</li>
            <li><strong>Overlays:</strong> Die Hintergründe hinter Stationsnamen (z.B. auf der Rettungsdienst-Karte) haben wieder den richtigen Abstand zum Text, und Symbole werden auf hochauflösenden Displays in korrekter Größe dargestellt.</li>
            <li><strong>Höhenlinien:</strong> Lassen sich wieder zuverlässig ein- und ausschalten.</li>
            <li><strong>Live-Tracking:</strong> Behobener Performance-Effekt beim häufigen Wechsel der Hintergrundkarte.</li>
          </ul>

          <h2>[3.4.0] - 2026-06-20</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Koordinaten:</strong> Neue Formate „Grad Dezimalminuten" (DDM) und „Plus Code" (Google Open Location Code). Ein Umschalter wechselt direkt zwischen Dezimalgrad, DDM und Grad/Minuten/Sekunden; alle Formate zeigen einheitlich die Himmelsrichtung als klickbares Suffix.</li>
          </ul>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Routing:</strong> Sondersignal-Routen („5 schnellste", Blaulicht) werden wieder korrekt auf der Karte angezeigt.</li>
            <li><strong>Karte:</strong> Hellerer Hintergrund des Kartenbereichs.</li>
          </ul>

          <h2>[3.3.2] - 2026-06-08</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Info-Bereich:</strong> Neue interaktive Detailansicht je Bundesland (Auflistung aller Rettungsdienst- und Notarzt-Stationen) sowie ein überarbeitetes Telemetrie-Dashboard für das Tracking-System.</li>
          </ul>
          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Info-Bereich:</strong> Fehler in der Regionen-Auswertung behoben; Health- und Tracking-Ansicht auf das neue Dashboard-Layout umgestellt.</li>
          </ul>

          <h2>[3.3.1] - 2026-05-21</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Zentrale Navigations-Optimierung:</strong> Integration von clientseitigem SPA-Routing für alle Topbar- und Logo-Navigationslinks, um nahtlose, neuladungsfreie Seitenwechsel zu ermöglichen.</li>
            <li><strong>CI-Konformität:</strong> Vollständiges Refactoring aller Portal-Seiten und Komponenten zur Eliminierung statischer/dynamischer inline CSS-Style-Attribute und Hex-Farben. Synchronisation des CI-Submoduls und Bereinigung redundanter Hilfsklassen.</li>
          </ul>

          <h3>Build- & Bibliotheken-Upgrades</h3>
          <ul>
            <li><strong>Vite 8 & TypeScript 6 Upgrade:</strong> Modernisierung der Build-Kette auf Vite 8 und TypeScript 6. Behebung strengerer Typ-Prüfungen bei CSS-Import-Seiteneffekten via \`src/vite-env.d.ts\`.</li>
            <li><strong>Geodaten-Rendering:</strong> Upgrade auf MapLibre GL JS v5 (inkl. WebGPU-Support) und PMTiles v4 zur Erhöhung der Performance und Zukunftssicherheit des Karten-Renderings.</li>
            <li><strong>UI-Assets:</strong> Upgrade auf FontAwesome v7.2.0 für modernste Symbol-Ressourcen.</li>
          </ul>

          <h2>[3.3.0] - 2026-05-19</h2>
          <h3>Neuigkeiten & Features</h3>
          <ul>
            <li><strong>Live Tracking Portal:</strong> Vollständige Integration von Flugverkehr (ADS-B) und Schifffahrt (AIS) mit Echtzeit-Updates via WebSocket. Inklusive Track-Historie und höhenabhängiger Farbcodierung.</li>
            <li><strong>Modernisiertes Routing:</strong> Neues modulares Routing-System mit Unterstützung für PKW und Blaulicht-Profile. Verbessertes Context-Menü für schnelle Zielwahl direkt auf der Karte.</li>
            <li><strong>Erweiterte Info-Zentrale:</strong> Live-Überwachung der Gateway-Telemetrie (Paketraten, Signalstärke) und detaillierte Status-Anzeige für alle Empfänger-Stationen.</li>
            <li><strong>Intelligentes Layer-Management:</strong> Neues Registry-System sorgt dafür, dass gewählte Overlays (RD-Stationen, Wanderwege etc.) beim Wechsel der Basiskarte automatisch erhalten bleiben.</li>
            <li><strong>Architektur V3:</strong> Komplette Umstellung der Anwendung auf ein performantes Controller-Modell für schnellere Seitenwechsel und sauberes Ressourcen-Management.</li>
          </ul>

          <h3>Verbesserungen & Fixes</h3>
          <ul>
            <li><strong>Overlay-Stabilität:</strong> Kritischer Fix für verschwindende Karten-Layer und Korrektur der URL-Auflösung für PMTiles-Quellen.</li>
            <li><strong>CI-Konformität:</strong> Umstellung aller UI-Elemente auf den neuesten Design-Standard inkl. Icon-Only Toggles in der Topbar.</li>
            <li><strong>Daten-Sicherheit:</strong> Implementierung von Deep-Cloning für Map-Ressourcen zur Vermeidung von internen Datenfehlern.</li>
          </ul>

          <h2>[3.2.9] - 2026-05-15</h2>
          <ul>
            <li><strong>Routing Seite:</strong> Fix der Highlight-Logik. Ergebnisse können nun durch erneuten Klick abgewählt werden. Strikte Einhaltung der CI-Farben für Routen.</li>
          </ul>

          <h2>[3.2.8] - 2026-05-15</h2>
          <ul>
            <li><strong>Routing Seite:</strong> Wiederherstellung der korrekten Sprite-basierten Stations-Icons aus dem 'oe5ith-markers' Set.</li>
          </ul>

          <h2>[3.2.7] - 2026-05-15</h2>
          <ul>
            <li><strong>Tracking Seite:</strong> Kritischer Fix für verschwindende Flugzeuge/Schiffe beim Wechsel der Basemap. Einführung einer robusten Layer-Restaurierung und eines Self-Healing Mechanismus.</li>
            <li><strong>Routing Seite:</strong> Fix für die Anzeige der 5 nächsten Standorte. Ergebnisse werden nun sofort visualisiert und bleiben nach Basemap-Wechsel erhalten.</li>
            <li><strong>Zentralisierung:</strong> Vereinheitlichung der Overlay-Verwaltung via MapCore über alle Seiten hinweg.</li>
          </ul>

          <h2>[3.2.6] - 2026-05-11</h2>
          <ul>
            <li><strong>CoordsPage:</strong> Einführung eines verbesserten Geocoder-Dropdowns mit kontextbezogenen Icons und optimierter Adress-Formatierung.</li>
          </ul>

          <h2>[3.2.0] - 2026-05-08</h2>
          <ul>
            <li><strong>Tracking Refinement:</strong> Vollständige Überarbeitung der ADS-B und AIS Visualisierung.</li>
            <li><strong>Improved Popup System:</strong> Einführung des PopupManagers für CI-konforme Datenanzeige.</li>
            <li><strong>Höhenabhängige Tracks:</strong> ADS-B Flugpfade werden farblich nach Höhe kodiert.</li>
          </ul>

          <h2>[3.1.0a1] - 2026-05-06</h2>
          <ul>
            <li><strong>Koordinaten-Konverter:</strong> Volle Unterstützung für manuelle Eingabe aller Systeme (WGS84, DMS, UTM, BMN, MGRS, Maidenhead).</li>
            <li><strong>Adress-Suche & Anzeige:</strong> Neues Feld "Adresse" unterstützt Forward- und Reverse-Geocoding.</li>
            <li><strong>Höhenlinien (Contours):</strong> Neuer Button zum Ein-/Ausblenden von topografischen Höhenlinien.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Copyright Modal -->
    <div class="modal-backdrop" id="copyright-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Copyright & Lizenzen</span>
          <button class="modal-close" data-close="copyright-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <h2>Karten & Daten</h2>
          <ul>
            <li><strong>OpenStreetMap:</strong> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a> (ODbL)</li>
            <li><strong>basemap.at:</strong> © <a href="https://basemap.at" target="_blank">basemap.at</a> (CC BY 4.0)</li>
          </ul>

          <h2>Bibliotheken</h2>
          <ul>
            <li><strong><a href="https://maplibre.org/" target="_blank">MapLibre GL JS</a></strong> (BSD-3-Clause)</li>
            <li><strong><a href="https://proj4js.github.io/proj4js/" target="_blank">proj4</a></strong> (MIT)</li>
            <li><strong><a href="https://github.com/proj4js/mgrs" target="_blank">mgrs</a></strong> (MIT)</li>
            <li><strong><a href="https://github.com/google/open-location-code" target="_blank">open-location-code</a></strong> (Apache-2.0)</li>
            <li><strong><a href="https://github.com/protomaps/pmtiles" target="_blank">pmtiles</a></strong> (BSD-3-Clause)</li>
          </ul>

          <h2>Design & Ressourcen</h2>
          <ul>
            <li><strong>Schriftart:</strong> <a href="https://www.jetbrains.com/lp/mono/" target="_blank">JetBrains Mono</a> (OFL 1.1)</li>
            <li><strong>Icons:</strong> <a href="https://fontawesome.com" target="_blank">Font Awesome 7 Free</a> (Icons CC BY 4.0, Schrift OFL 1.1, Code MIT)</li>
          </ul>

          <h2>Kontakt & Impressum</h2>
          <ul>
            <li><strong>Daniel Herbrik</strong></li>
            <li><a href="mailto:daniel@oe5ith.at">daniel@oe5ith.at</a></li>
          </ul>

          <h2>Datenschutz</h2>
          <p>Diese Anwendung verwendet kein Tracking, keine Cookies und keine Analyse-Dienste.
          <code>localStorage</code> wird ausschließlich genutzt, um die zuletzt gewählte
          Basiskarte zu merken — rein lokal im Browser, ohne Übertragung an den Server.
          Anfragen an Routing-, Geocoding- und Tracking-Funktionen laufen über den eigenen
          Server-Proxy und erscheinen dort nur in den Standard-Zugriffslogs, wie bei jedem
          Webserver üblich.</p>

          <h2>Software</h2>
          <p>© 2026 OE5ITH Cloud Services. Alle Rechte vorbehalten.</p>
          <p class="t-tiny t-subtle">Anwendung Version: ${APP_VERSION}</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(mount);

  // Global Event Listeners
  window.addEventListener('open-changelog', () => {
    document.getElementById('changelog-modal')?.classList.add('open');
  });

  window.addEventListener('open-copyright', () => {
    document.getElementById('copyright-modal')?.classList.add('open');
  });

  // Close Logic via Delegation
  mount.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Close via Button
    const closeBtn = target.closest('.modal-close');
    if (closeBtn) {
      const modalId = closeBtn.getAttribute('data-close');
      if (modalId) document.getElementById(modalId)?.classList.remove('open');
      return;
    }

    // Close via Backdrop
    if (target.classList.contains('modal-backdrop')) {
      target.classList.remove('open');
    }
  });
};
