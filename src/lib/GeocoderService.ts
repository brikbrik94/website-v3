export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

const GEOCODER_BASE_URL = '/api/geocoder.php';

export const GeocoderService = {
  async search(query: string): Promise<GeocodeResult[]> {
    if (!query || query.length < 3) return [];

    try {
      // Wir rufen den Proxy direkt auf, dieser leitet an Nominatim weiter
      const url = `${GEOCODER_BASE_URL}?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Geocoding fehlgeschlagen');
      
      const data = await res.json();
      return data as GeocodeResult[];
    } catch (e) {
      console.error('Geocoder Error:', e);
      return [];
    }
  },

  async reverse(lat: number, lon: number): Promise<GeocodeResult | null> {
    try {
      const url = `${GEOCODER_BASE_URL}?reverse=1&lat=${lat}&lon=${lon}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Reverse Geocoding fehlgeschlagen');
      
      const data = await res.json();
      
      // Nominatim reverse liefert bei Erfolg ein Objekt mit display_name
      if (data && data.display_name) {
        return data as GeocodeResult;
      }
      
      // Falls es ein Array ist (unüblich bei reverse, aber zur Sicherheit)
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as GeocodeResult;
      }
      
      return null;
    } catch (e) {
      console.error('Reverse Geocoder Error:', e);
      return null;
    }
  }
};
