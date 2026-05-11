import { GeocodeResult } from './GeocoderService';

/**
 * Maps Nominatim class/type to FontAwesome icons
 */
export const getIconForGeocodeResult = (res: GeocodeResult): string => {
  const cls = res.class;
  const type = res.type;

  if (cls === 'amenity') {
    if (type === 'hospital' || type === 'clinic') return 'fa-hospital';
    if (type === 'pharmacy') return 'fa-staff-snake';
    if (type === 'restaurant' || type === 'cafe') return 'fa-utensils';
    if (type === 'police') return 'fa-shield-halved';
    if (type === 'fire_station') return 'fa-fire-extinguisher';
    return 'fa-location-dot';
  }

  if (cls === 'natural') {
    if (type === 'peak' || type === 'volcano') return 'fa-mountain';
    if (type === 'water' || type === 'lake') return 'fa-water';
    return 'fa-tree';
  }

  if (cls === 'place') {
    if (type === 'city' || type === 'town' || type === 'village') return 'fa-city';
    return 'fa-map-pin';
  }

  if (cls === 'highway') return 'fa-road';
  if (cls === 'railway') return 'fa-train';
  if (cls === 'boundary') return 'fa-map';

  return 'fa-house'; // Default: Address/Building
};

/**
 * Renders the HTML for a single geocoder item
 */
export const renderGeocodeItemHtml = (res: GeocodeResult): string => {
  const parts = res.display_name.split(',');
  const title = parts[0].trim();
  const subtitle = parts.slice(1).join(',').trim();
  const icon = getIconForGeocodeResult(res);

  return `
    <div class="geocoder-item" data-lat="${res.lat}" data-lon="${res.lon}" data-name="${res.display_name}">
      <i class="fa-solid ${icon} geocoder-icon"></i>
      <div class="geocoder-content">
        <span class="geocoder-title">${title}</span>
        <span class="geocoder-subtitle">${subtitle}</span>
      </div>
    </div>
  `;
};
