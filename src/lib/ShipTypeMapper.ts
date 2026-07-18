import { MAP_COLORS } from './MapStyles';

/**
 * Ordnet AIS/ERIDM-Schiffstyp-Codes (Standard-AIS 0-99, Inland-ERIDM 8000+) einem Sprite,
 * einer lesbaren Klassenbezeichnung und einer von 3 Farb-Buckets zu (Tanker/Behörde-SAR →
 * `danger`, Passagier-/Fahrgastschiff → `warning`, alles andere → `accent`).
 */
export class ShipTypeMapper {
  /**
   * Returns the sprite ID for a given AIS/ERIDM ship type code.
   */
  static getSprite(code: number | string | undefined): string {
    const n = typeof code === 'string' ? parseInt(code, 10) : (code || 0);
    
    // Inland AIS (ERIDM)
    if (n >= 8000 && n <= 8019) return 'ship-cargo';
    if (n >= 8020 && n <= 8029) return 'ship-tanker';
    if (n >= 8440 && n <= 8449) return 'ship-passenger';
    if (n >= 8210 && n <= 8229) return 'ship-cargo'; // Future: ship-tug
    if (n === 8430 || n === 8450) return 'ship-cargo'; // Future: ship-special
    
    // Standard AIS
    if (n >= 30 && n <= 39) return 'ship-small';
    if (n >= 50 && n <= 59) return 'ship-small'; // Future: ship-emergency
    if (n >= 70 && n <= 79) return 'ship-cargo';
    if (n >= 80 && n <= 89) return 'ship-tanker';
    if (n >= 60 && n <= 69) return 'ship-passenger';
    if (n === 90) return 'ship-buoy';

    return 'ship-unknown';
  }

  /**
   * Returns a human-readable class name.
   */
  static getClassName(code: number | string | undefined): string {
    const n = typeof code === 'string' ? parseInt(code, 10) : (code || 0);
    
    // Inland AIS
    if (n >= 8000 && n <= 8019) return 'Gütermotorschiff';
    if (n >= 8020 && n <= 8029) return 'Tankschiff';
    if (n >= 8440 && n <= 8449) return 'Fahrgastschiff';
    if (n >= 8210 && n <= 8229) return 'Schlepper/Schubboot';
    if (n === 8430) return 'Dienstfahrzeug';
    if (n === 8450) return 'Eisbrecher';
    
    // Standard AIS
    if (n >= 30 && n <= 39) return 'Sportboot';
    if (n >= 50 && n <= 59) return 'Behörde/SAR';
    if (n >= 70 && n <= 79) return 'Frachtschiff';
    if (n >= 80 && n <= 89) return 'Tanker';
    if (n >= 60 && n <= 69) return 'Passagierschiff';
    if (n === 90) return 'Seezeichen';

    return `Unbekannt (${n})`;
  }

  /**
   * Returns the color token for the UI.
   */
  static getColor(code: number | string | undefined): string {
    const n = typeof code === 'string' ? parseInt(code, 10) : (code || 0);
    
    if ((n >= 8020 && n <= 8029) || (n >= 80 && n <= 89) || (n >= 50 && n <= 59)) {
      return MAP_COLORS.danger;
    }
    if ((n >= 8440 && n <= 8449) || (n >= 60 && n <= 69)) {
      return MAP_COLORS.warning;
    }
    return MAP_COLORS.accent;
  }
}
