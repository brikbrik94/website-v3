const TITLE_KEYS = ['name', 'title', 'ref', 'id'];
const MAX_VALUE_LENGTH = 200;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isDisplayable(key: string, value: unknown): value is string | number {
  if (key.startsWith('_')) return false;
  if (value == null || value === '') return false;
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) return false;
  return true;
}

/**
 * Baut ein generisches Feature-Popup aus rohen GeoJSON-properties — für die heterogenen,
 * unkuratierten Overlay-Layer auf /karte (Autobahnen, Gemeinden, Höhenlinien, …), bei denen ein
 * kuratiertes Feld-Mapping pro Layer (wie PopupManager.POPUP_CONFIGS) angesichts hunderter
 * Sub-Layer nicht praktikabel ist. Titel per Heuristik (erste vorhandene Property aus
 * name/title/ref/id), sonst die Layer-ID. Restliche properties als Key-Value-Liste, mit
 * Basis-Filterung (keine internen _-Felder, keine leeren/sehr langen Werte).
 */
export function buildGenericFeaturePopupHtml(layerId: string, properties: Record<string, unknown>): string {
  let titleKey: string | null = null;
  let title: string = layerId;

  for (const key of TITLE_KEYS) {
    const value = properties[key];
    if (isDisplayable(key, value)) {
      titleKey = key;
      title = String(value);
      break;
    }
  }

  const rows = Object.entries(properties)
    .filter(([key, value]) => key !== titleKey && isDisplayable(key, value))
    .map(([key, value]) => `
      <tr>
        <td class="popup-label">${escapeHtml(key)}</td>
        <td class="popup-value">${escapeHtml(String(value))}</td>
      </tr>`)
    .join('');

  return `
    <div class="map-popup-detail">
      <div class="popup-header">
        <div class="popup-header-title">
          <i class="fa-solid fa-circle-info"></i>
          <strong>${escapeHtml(title)}</strong>
        </div>
      </div>
      <table class="popup-kv">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `.trim();
}
