import { GraphFeatures } from './GraphMapLayers';
import { GraphExportFormat } from '../../lib/GraphExportService';

export interface GraphExportState {
  bbox: [[number, number], [number, number]];
  profile: string;
  format: GraphExportFormat;
  geometry: boolean;
  features: GraphFeatures;
  payloadBytes: number;
}

/**
 * Hält genau eine aktive Graph-Abfrage — kein Stapeln mehrerer Abfragen wie bei Isochronen,
 * jede neue Abfrage ersetzt die vorherige (siehe Design-Spec "Out of Scope").
 */
export class GraphDataService {
  private current: GraphExportState | null = null;

  public setResult(state: GraphExportState): void {
    this.current = state;
  }

  public getResult(): GraphExportState | null {
    return this.current;
  }
}
