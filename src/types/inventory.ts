export interface MapItem {
    name: string;
    type: string;
    style: { url: string };
    file: { url: string };
    project?: string;
}

export interface Inventory {
    maps: MapItem[];
}

export interface InventoryMap {
    name: string;
    project: string;
    type: string;
    file: {
        url: string;
        stats: {
            size_str: string;
            date_str: string;
        };
    };
    style: {
        url: string;
    };
}

export interface InventoryFont {
    family: string;
    variants: Array<{
        name: string;
        style: string;
        url: string;
    }>;
}

export interface InventorySprite {
    name: string;
    url: string;
    preview: string;
}

export interface InventoryResponse {
    generated_at: string;
    maps: InventoryMap[];
    fonts: InventoryFont[];
    sprites: InventorySprite[];
}
