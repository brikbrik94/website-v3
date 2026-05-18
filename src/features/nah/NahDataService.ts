import { NahStation, NahResponse, NahStationResult } from '../../types/nah';
import { calculateDistance, calculateFlightTime, formatDuration, formatETA } from '../../lib/FlightMath';

export type NahDataCallback = (stations: NahStation[]) => void;
export type NahStatusCallback = (online: boolean) => void;

/**
 * Service for managing NAH (Luftrettung) station data, 
 * automatic refresh cycles, and server heartbeat.
 */
export class NahDataService {
  private stations: NahStation[] = [];
  private refreshTimeout: any = null;
  private connectionInterval: any = null;
  private onDataUpdated: NahDataCallback | null = null;
  private onStatusUpdated: NahStatusCallback | null = null;
  private signal: AbortSignal;

  constructor(signal: AbortSignal) {
    this.signal = signal;
    
    // Auto-stop when signal is aborted
    this.signal.addEventListener('abort', () => {
      this.stop();
    });
  }

  /**
   * Registers callbacks for data updates and status changes.
   */
  public setCallbacks(onData: NahDataCallback, onStatus: NahStatusCallback): void {
    this.onDataUpdated = onData;
    this.onStatusUpdated = onStatus;
  }

  /**
   * Starts the initial data fetch and the heartbeat monitor.
   */
  public async start(): Promise<void> {
    await this.refresh();
    this.startHeartbeat();
  }

  /**
   * Stops all timers. Usually called automatically via AbortSignal.
   */
  public stop(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    if (this.connectionInterval) {
      clearInterval(this.connectionInterval);
      this.connectionInterval = null;
    }
  }

  /**
   * Returns the currently cached station list.
   */
  public getStations(): NahStation[] {
    return this.stations;
  }

  /**
   * Calculates the nearest active stations for a given coordinate.
   */
  public getNearestActiveStations(lng: number, lat: number, limit: number = 5): NahStationResult[] {
    return this.stations
      .filter((s) => s.is_active)
      .map((s) => {
        const dist = calculateDistance(lat, lng, s.lat, s.lon);
        const duration = calculateFlightTime(dist);
        return {
          ...s,
          distance: dist,
          duration,
          durationStr: formatDuration(duration),
          eta: formatETA(duration)
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Manually triggers a station data refresh.
   */
  public async refresh(): Promise<void> {
    if (this.signal.aborted) return;

    try {
      const response = await fetch('/api/nah.php', { signal: this.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const data: NahResponse = await response.json();
      this.stations = data.stations || [];
      
      if (this.onDataUpdated) {
        this.onDataUpdated(this.stations);
      }

      if (data.refresh_at) {
        this.scheduleNextRefresh(data.refresh_at);
      } else if (data.reload_after) {
        this.scheduleNextRefresh(data.reload_after * 1000);
      } else {
        // Default fallback: 30 minutes
        this.scheduleNextRefresh(1800000);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[NahDataService] Refresh failed', err);
      // Retry in 60 seconds on network/server error
      this.scheduleNextRefresh(60000);
    }
  }

  private startHeartbeat(): void {
    if (this.signal.aborted) return;
    this.heartbeat();
    this.connectionInterval = setInterval(() => this.heartbeat(), 30000);
  }

  private async heartbeat(): Promise<void> {
    if (this.signal.aborted) return;

    try {
      const res = await fetch('/api/ping.php', { signal: this.signal });
      if (this.onStatusUpdated) {
        this.onStatusUpdated(res.ok);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      if (this.onStatusUpdated) {
        this.onStatusUpdated(false);
      }
    }
  }

  private scheduleNextRefresh(refreshAtOrDelay: string | number): void {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
    if (this.signal.aborted) return;

    let delay: number;
    if (typeof refreshAtOrDelay === 'string') {
      const targetTime = Date.parse(refreshAtOrDelay);
      const now = Date.now();
      delay = targetTime - now + 10000; // 10s safety buffer
    } else {
      delay = refreshAtOrDelay;
    }
    
    // Minimum refresh interval 30s
    if (delay < 30000) delay = 30000;

    console.debug(`[NahDataService] Next reload scheduled in ${Math.round(delay/1000)}s`);

    this.refreshTimeout = setTimeout(() => {
      if (!this.signal.aborted) {
        this.refresh();
      }
    }, delay);
  }
}
