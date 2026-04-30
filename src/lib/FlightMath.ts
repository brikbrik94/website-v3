/**
 * OE5ITH Flight Math Utility
 * Berechnungen für Luftrettung (Luftlinie, Flugzeit, ETA)
 */

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Erdradius in Metern
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distanz in Metern
};

export const calculateFlightTime = (distanceInMeters: number): number => {
  const speedMs = 63.9; // 230 km/h in m/s
  const startupDelay = 120; // 2 Minuten Startpauschale
  return startupDelay + (distanceInMeters / speedMs);
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
};

export const formatETA = (seconds: number): string => {
  const now = new Date();
  const eta = new Date(now.getTime() + seconds * 1000);
  return eta.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};
