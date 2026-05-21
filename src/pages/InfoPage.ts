import { initTopbar } from '../components/Topbar';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';
import { renderNahStatusModule } from '../components/info/NahStatusModule';
import { renderHealthModule } from '../components/info/HealthModule';
import { renderRegionsModule } from '../components/info/RegionsModule';
import { renderInventoryModule } from '../components/info/InventoryModule';
import { renderDebugModule } from '../components/info/DebugModule';
import { BasePageController } from '../core/BasePageController';
import { renderTrackingEndpointsModule } from '../components/info/TrackingEndpointsModule';

/**
 * Info & Debug Page Controller
 * Handles layout, module switching and resource lifecycle.
 */
export class InfoPageController extends BasePageController {

  public override async mount(container: HTMLElement, subpath: string = 'nah'): Promise<void> {
    container.innerHTML = `
      <div id="topbar-mount"></div>
      <div class="layout">
        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-inner">
            <div class="sidebar-section-label">MODULE</div>
            <a href="/info/nah" class="sidebar-nav-item nav-link ${subpath === 'nah' ? 'active' : ''}" data-module="nah">
              <i class="fa-solid fa-helicopter nav-icon"></i> NAH Status
            </a>
            <a href="/info/health" class="sidebar-nav-item nav-link ${subpath === 'health' ? 'active' : ''}" data-module="health">
              <i class="fa-solid fa-heart-pulse nav-icon"></i> Service Health
            </a>
            <a href="/info/regions" class="sidebar-nav-item nav-link ${subpath === 'regions' ? 'active' : ''}" data-module="regions">
              <i class="fa-solid fa-map-location nav-icon"></i> Regions Analyse
            </a>
            <a href="/info/tracking" class="sidebar-nav-item nav-link ${subpath === 'tracking' ? 'active' : ''}" data-module="tracking">
              <i class="fa-solid fa-satellite-dish nav-icon"></i> Tracking API
            </a>
            <a href="/info/inventory" class="sidebar-nav-item nav-link ${subpath === 'inventory' ? 'active' : ''}" data-module="inventory">
              <i class="fa-solid fa-layer-group nav-icon"></i> Karten Inventar
            </a>
            <a href="/info/debug" class="sidebar-nav-item nav-link ${subpath === 'debug' ? 'active' : ''}" data-module="debug">
              <i class="fa-solid fa-terminal nav-icon"></i> API Debug
            </a>
          </div>
          ${getSidebarFooterHtml()}
          <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
        </aside>
        <main class="page-content" id="info-content-mount">
        </main>
      </div>
    `;

    setupSidebarToggle(
      document.getElementById('sidebar')!,
      document.getElementById('sidebar-tab')!,
      document.getElementById('sidebar-backdrop')!
    );

    // Initialize Topbar (minimal version for landing/info)
    const topbarMount = document.getElementById('topbar-mount')!;
    initTopbar(topbarMount, [], () => {});

    const contentMount = document.getElementById('info-content-mount')!;
    
    if (subpath === 'nah') {
      renderNahStatusModule(contentMount, this.signal);
    } else if (subpath === 'health') {
      renderHealthModule(contentMount, this.signal);
    } else if (subpath === 'tracking') {
      renderTrackingEndpointsModule(contentMount, this.signal);
    } else if (subpath === 'regions') {
      renderRegionsModule(contentMount, this.signal);
    } else if (subpath === 'inventory') {
      renderInventoryModule(contentMount, this.signal);
    } else if (subpath === 'debug') {
      renderDebugModule(contentMount, this.signal);
    } else {
      contentMount.innerHTML = `
        <div class="content-body">
          <div class="panel">
            <div class="panel-body">Coming soon...</div>
          </div>
        </div>
      `;
    }
  }

  public override destroy(): void {
    super.destroy();
  }
}
