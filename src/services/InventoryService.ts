import { Inventory, MapItem } from '../types/inventory';

export class InventoryService {
    private static instance: InventoryService;
    private inventory: Inventory | null = null;
    private inventoryUrl = 'https://tiles.oe5ith.at/inventory.json';

    private constructor() {}

    public static getInstance(): InventoryService {
        if (!InventoryService.instance) {
            InventoryService.instance = new InventoryService();
        }
        return InventoryService.instance;
    }

    public async getInventory(): Promise<Inventory> {
        if (this.inventory) {
            return this.inventory;
        }

        try {
            const res = await fetch(this.inventoryUrl);
            if (!res.ok) throw new Error(`Failed to load inventory from ${this.inventoryUrl}`);
            this.inventory = await res.json();
            return this.inventory!;
        } catch (err) {
            console.error('[InventoryService] Error loading inventory:', err);
            // Return empty fallback to prevent crashes
            return { maps: [] };
        }
    }

    public async getBasemaps(): Promise<MapItem[]> {
        const inv = await this.getInventory();
        return inv.maps.filter(m => m.type === 'basemap');
    }

    public async getOverlays(): Promise<MapItem[]> {
        const inv = await this.getInventory();
        return inv.maps.filter(m => m.type === 'overlay');
    }

    public async getDefaultBasemapStyle(): Promise<string> {
        const basemaps = await this.getBasemaps();
        return basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json';
    }
}
