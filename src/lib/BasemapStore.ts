const BASEMAP_KEY = 'oe5ith-last-basemap';
const DEFAULT_BASEMAP = 'https://tiles.oe5ith.at/basemaps/styles/at/style.json';

export const BasemapStore = {
  get(): string {
    return localStorage.getItem(BASEMAP_KEY) || DEFAULT_BASEMAP;
  },
  set(url: string) {
    localStorage.setItem(BASEMAP_KEY, url);
  }
};
