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
        <div class="modal-body">
          <h2>[3.1.0a1] - 2026-05-06</h2>
          <ul>
            <li><strong>Koordinaten-Konverter:</strong> Volle Unterstützung für manuelle Eingabe aller Systeme (WGS84, DMS, UTM, BMN, MGRS, Maidenhead).</li>
            <li><strong>Adress-Suche & Anzeige:</strong> Neues Feld "Adresse" ganz oben. Unterstützt Forward-Geocoding (Suche), Reverse-Geocoding (Anzeige) und Kopieren.</li>
            <li><strong>Höhenlinien (Contours):</strong> Neuer Button in der Topbar des Umrechners zum Ein-/Ausblenden von topografischen Höhenlinien.</li>
            <li><strong>Globales UI-Styling:</strong> CI-konforme Definition für Scrollbalken eingeführt.</li>
            <li><strong>Globales Changelog-Modal:</strong> Versionsnummer im Footer ist nun auf allen Seiten klickbar.</li>
            <li><strong>Globales Copyright-Modal:</strong> Copyright-Button (©) im Footer zeigt nun eine Übersicht aller Lizenzen und Quellen.</li>
          </ul>
          <h2>Behoben</h2>
          <ul>
            <li><strong>Eingabe-Fokus:</strong> Fix für Fokusverlust bei manueller Koordinateneingabe in der Sidebar.</li>
            <li><strong>Versionierung:</strong> Zentralisierung der App-Version über alle Komponenten.</li>
            <li><strong>UI-Konsistenz:</strong> Vereinheitlichung des Sidebar-Footers über alle Seiten.</li>
          </ul>
          <h2>[3.0.1] - 2026-05-02</h2>
          <p>Initialer Release von website-v3 mit MapLibre Integration (NAH Status, Routing).</p>
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
            <li><strong>Bibliotheken:</strong> Leaflet (BSD-2), MapLibre GL JS (BSD-3)</li>
          </ul>

          <h2>Design & Ressourcen</h2>
          <ul>
            <li><strong>Schriftart:</strong> <a href="https://www.jetbrains.com/lp/mono/" target="_blank">JetBrains Mono</a> (OFL 1.1)</li>
            <li><strong>Icons:</strong> <a href="https://fontawesome.com" target="_blank">Font Awesome 6 Free</a> (CC BY 4.0 / MIT)</li>
          </ul>

          <h2>Software</h2>
          <p>© 2026 OE5ITH Cloud Services. Alle Rechte vorbehalten.</p>
          <p style="font-size: 0.75rem; color: var(--subtle);">Anwendung Version: ${APP_VERSION}</p>
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
