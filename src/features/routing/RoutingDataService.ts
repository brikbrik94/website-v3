export class RoutingDataService {
  private startCoord: [number, number] | null = null;
  private targetCoord: [number, number] | null = null;
  private stationRoutes = new Map<number, any>();
  private eyeActiveStates = new Set<number>();
  private currentHighlightedId: number | null = null;
  private nearestStations: any[] = [];

  public getStartCoord() { return this.startCoord; }
  public getTargetCoord() { return this.targetCoord; }
  
  public setCoords(type: 'start' | 'target', coord: [number, number]) {
    if (type === 'start') this.startCoord = coord;
    else this.targetCoord = coord;
  }

  public getStationRoutes() { return this.stationRoutes; }
  public setStationRoute(id: number, route: any) { this.stationRoutes.set(id, route); }

  public getEyeActiveStates() { return this.eyeActiveStates; }
  public setEyeActiveState(id: number, active: boolean) {
    if (active) this.eyeActiveStates.add(id);
    else this.eyeActiveStates.delete(id);
  }

  public getCurrentHighlightedId() { return this.currentHighlightedId; }
  public setCurrentHighlightedId(id: number | null) { this.currentHighlightedId = id; }

  public getNearestStations() { return this.nearestStations; }
  public setNearestStations(stations: any[]) { this.nearestStations = stations; }

  public clearResults() {
    this.stationRoutes.clear();
    this.eyeActiveStates.clear();
    this.currentHighlightedId = null;
    this.nearestStations = [];
  }
  
  public clearCoords() {
    this.startCoord = null;
    this.targetCoord = null;
  }
}
