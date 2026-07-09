import { NahStation } from '../../types/nah';
import type { BadgeClass } from '../../lib/BadgeStyles';

export type NahStationStatus = 'active' | 'inactive' | 'offseason';

const STATUS_BADGE_CLASS: Record<NahStationStatus, BadgeClass> = {
  active: 'badge-green',
  inactive: 'badge-red',
  offseason: 'badge-gray',
};

const STATUS_TEXT: Record<NahStationStatus, string> = {
  active: 'EINSATZBEREIT',
  inactive: 'AUSSER DIENST (Betriebszeit)',
  offseason: 'AUSSER SAISON',
};

export function computeStationStatus(station: NahStation): NahStationStatus {
  if (!station.in_season) return 'offseason';
  if (!station.is_active) return 'inactive';
  return 'active';
}

function buildHoursHtml(station: NahStation): string {
  if (station.op_type === 'fixed' && station.fixed_start && station.fixed_end) {
    return `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end}</td></tr>`;
  }
  if (station.op_type === 'daylight') {
    if (station.fixed_start && station.fixed_end) {
      return `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end} (max. ECET)</td></tr>`;
    }
    if (station.fixed_start) {
      return `<tr><td>Zeiten</td><td>Ab ${station.fixed_start} bis ECET</td></tr>`;
    }
    return `<tr><td>Zeiten</td><td>BCET bis ECET</td></tr>`;
  }
  if (station.op_type === '24/7') {
    return `<tr><td>Zeiten</td><td>24 Stunden / 7 Tage</td></tr>`;
  }
  return '';
}

export function buildStationPopupHtml(station: NahStation): string {
  const status = computeStationStatus(station);
  const badgeClass = STATUS_BADGE_CLASS[status];
  const statusText = STATUS_TEXT[status];
  const hoursHtml = buildHoursHtml(station);

  return `
    <div class="map-popup-detail">
      <div class="popup-header">
        <div class="popup-header-title">${station.callsign}</div>
        <div class="popup-header-org">${station.name}</div>
      </div>
      <table class="popup-kv">
        <tr><td>Status</td><td><span class="badge ${badgeClass}">${statusText}</span></td></tr>
        <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
        ${hoursHtml}
        <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
        ${status === 'offseason' ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
      </table>
    </div>
  `;
}

export function buildMultiStationPopupHtml(stations: NahStation[]): string {
  return `
    <div class="map-popup-detail">
      <div class="popup-header">
        <div class="popup-header-title">${stations.length} Stationen am Standort</div>
      </div>
      <div class="popup-stations-list">
        ${stations.map(station => {
          const status = computeStationStatus(station);
          const badgeClass = STATUS_BADGE_CLASS[status];
          const statusText = STATUS_TEXT[status];
          const hoursHtml = buildHoursHtml(station);

          return `
          <div class="popup-station-item">
            <div class="popup-station-header">
              <div class="popup-header-title">${station.callsign}</div>
              <div class="popup-header-org">${station.name}</div>
            </div>
            <div class="popup-station-details">
              <table class="popup-kv">
                <tr><td>Status</td><td><span class="badge ${badgeClass}">${statusText}</span></td></tr>
                <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
                ${hoursHtml}
                <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
                ${status === 'offseason' ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
              </table>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
