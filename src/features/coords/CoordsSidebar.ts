import { CoordsDataService } from './CoordsDataService';
import { getSidebarFooterHtml, setupSidebarToggle } from '../../lib/SidebarUtils';
import { AddressBlock } from './blocks/AddressBlock';
import { Wgs84Block } from './blocks/Wgs84Block';
import { UtmBlock } from './blocks/UtmBlock';
import { BmnBlock } from './blocks/BmnBlock';
import { MgrsBlock } from './blocks/MgrsBlock';
import { MaidenheadBlock } from './blocks/MaidenheadBlock';
import { PlusCodeBlock } from './blocks/PlusCodeBlock';
import { CoordSystemBlock } from './CoordSystemBlock';

export class CoordsSidebar {
  private blocks: CoordSystemBlock[] = [];
  private activeSystemId: string = 'address';

  constructor(
    private container: HTMLElement,
    private service: CoordsDataService,
    private signal: AbortSignal
  ) {}

  public init() {
    const isMobile = window.innerWidth <= 768;
    this.container.innerHTML = `
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-inner" id="coords-blocks-container">
          <!-- Blocks will be injected here -->
        </div>
        ${getSidebarFooterHtml()}
        <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">${isMobile ? '›' : '‹'}</div>
      </aside>
    `;

    const blocksContainer = this.container.querySelector('#coords-blocks-container') as HTMLElement;
    
    // Initialize blocks
    this.blocks = [
      new AddressBlock(blocksContainer, this.service, 'address', 'Adresse', this.signal),
      new Wgs84Block(blocksContainer, this.service, 'wgs84', 'WGS84'),
      new UtmBlock(blocksContainer, this.service, 'utm', 'UTM'),
      new BmnBlock(blocksContainer, this.service, 'bmn', 'BMN'),
      new MgrsBlock(blocksContainer, this.service, 'mgrs', 'MGRS'),
      new MaidenheadBlock(blocksContainer, this.service, 'maidenhead', 'Maidenhead'),
      new PlusCodeBlock(blocksContainer, this.service, 'pluscode', 'Plus Code')
    ];

    this.blocks.forEach((block, index) => {
      block.init();
      if (index < this.blocks.length - 1) {
        const sep = document.createElement('div');
        sep.className = 'tool-sep';
        blocksContainer.appendChild(sep);
      }
    });

    // Set initial active state
    this.setActiveBlock(this.activeSystemId);

    // Setup sidebar toggle
    const sidebar = this.container.querySelector('#sidebar') as HTMLElement;
    const sidebarTab = this.container.querySelector('#sidebar-tab') as HTMLElement;
    const sidebarBackdrop = this.container.querySelector('#sidebar-backdrop') as HTMLElement;
    setupSidebarToggle(sidebar, sidebarTab, sidebarBackdrop);

    // Listen for block activation
    blocksContainer.addEventListener('block-activated', (e: Event) => {
      this.setActiveBlock((e as CustomEvent<{ systemId: string }>).detail.systemId);
    });

    // Subscribe to service updates
    this.service.addListener((state) => {
      this.blocks.forEach(block => block.update(state));
    });

    // Initial update
    const initialState = this.service.getWgs();
    this.blocks.forEach(block => block.update(initialState));
  }

  private setActiveBlock(systemId: string) {
    this.activeSystemId = systemId;
    this.blocks.forEach(block => {
      if (block.getSystemId() === systemId) {
        block.setActive();
      } else {
        block.setInactive();
      }
    });
  }
}
