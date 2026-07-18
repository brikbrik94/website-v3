import { IsochroneQuery } from '../../types/common';

/**
 * State-Container für gestapelte Isochronen-Abfragen. Struktur analog zu
 * RoutingDataService.stationRoutes/eyeActiveStates — eine Query pro Berechnung, per Augen-Icon
 * einzeln ein-/ausblendbar.
 */
export class IsochronesDataService {
  private queries = new Map<number, IsochroneQuery>();
  private eyeActiveStates = new Set<number>();
  private nextId = 1;

  public addQuery(query: Omit<IsochroneQuery, 'id'>): IsochroneQuery {
    const id = this.nextId++;
    const full: IsochroneQuery = { ...query, id };
    this.queries.set(id, full);
    // Neu berechnete Abfrage ist sofort sichtbar — der Nutzer hat gerade aktiv danach gefragt,
    // ein zusätzlicher Klick aufs Auge wäre unnötige Reibung.
    this.eyeActiveStates.add(id);
    return full;
  }

  public removeQuery(id: number): void {
    this.queries.delete(id);
    this.eyeActiveStates.delete(id);
  }

  public clearAll(): void {
    this.queries.clear();
    this.eyeActiveStates.clear();
  }

  public getQueries(): Map<number, IsochroneQuery> {
    return this.queries;
  }

  public getQuery(id: number): IsochroneQuery | undefined {
    return this.queries.get(id);
  }

  public getEyeActiveStates(): Set<number> {
    return this.eyeActiveStates;
  }

  public isEyeActive(id: number): boolean {
    return this.eyeActiveStates.has(id);
  }

  public setEyeActiveState(id: number, active: boolean): void {
    if (active) this.eyeActiveStates.add(id);
    else this.eyeActiveStates.delete(id);
  }
}
