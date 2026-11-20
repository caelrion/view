/**
 * Licensed dark vector style endpoints for the Argos-matched 2D map.
 *
 * Argos public attributions claim CARTO Dark Matter (CC BY 4.0) design with
 * OpenFreeMap tiles / OpenMapTiles schema / OSM ODbL. We use OpenFreeMap's
 * public `dark` style JSON (compatible dark appearance) — not Argos runtime
 * URLs and not proprietary Argos assets.
 *
 * Terms must be re-verified if providers change; missing rights => HOLD and
 * fall back to the offline style stub below.
 */

export const OPENFREEMAP_DARK_STYLE_URL =
  'https://tiles.openfreemap.org/styles/dark';

export const MAP_ATTRIBUTION_HTML =
  '© <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a> Dark Matter (CC BY 4.0) · ' +
  'Tiles <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> / ' +
  '<a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · ' +
  'Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)';

/** Offline/fallback style when remote tiles are unavailable. */
export function createOfflineDarkStyleStub() {
  return {
    version: 8,
    name: 'caelrion-offline-dark-stub',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0b0f14' },
      },
    ],
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  };
}

export const MAP_LICENSE_MANIFEST = Object.freeze({
  style_design: {
    claim: 'CARTO Dark Matter visual family',
    license: 'CC BY 4.0',
    url: 'https://carto.com/',
  },
  tiles: {
    provider: 'OpenFreeMap',
    url: 'https://openfreemap.org/',
    schema: 'OpenMapTiles',
    schema_url: 'https://openmaptiles.org/',
  },
  data: {
    provider: 'OpenStreetMap contributors',
    license: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  fonts: {
    ui: 'Inter / Montserrat / Open Sans / Noto Sans (SIL OFL where applicable)',
    map_glyphs: 'OpenFreeMap hosted glyphs for OpenMapTiles stacks',
  },
  maplibre: {
    package: 'maplibre-gl',
    license: 'BSD-3-Clause',
  },
  not_used: [
    'Argos proprietary source',
    'Argos branded marks/assets',
    'Hotlinked Argos runtime tile URLs',
  ],
});
