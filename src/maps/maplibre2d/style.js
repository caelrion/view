/**
 * MapLibre styles for the Argos-matched 2D map.
 *
 * V1.2 primary: Esri World Imagery (incumbent keyless ArcGIS Online service
 * already used by Cesium `createEsriImagery`) + OpenFreeMap/OpenMapTiles
 * road/label overlay. Fiord remains the satellite-unavailable fallback.
 * Offline slate stub is last resort when no remote style can load.
 *
 * Terms: DATA_SOURCES.md — Esri World Imagery public endpoint with required
 * attribution; OpenMapTiles/OSM ODbL for vector overlay. Not Argos assets.
 */

import { ESRI_ATTRIBUTION_HTML } from '../imagery.js';

/** Los Angeles default camera (MapLibre [lon, lat]). */
export const DEFAULT_MAP_CENTER = Object.freeze([-118.2437, 34.0522]);
export const DEFAULT_MAP_ZOOM = 10.5;

/** OpenFreeMap Fiord — V1.1 / satellite-unavailable fallback. */
export const OPENFREEMAP_FIORD_STYLE_URL =
  'https://tiles.openfreemap.org/styles/fiord';

/** Retained for rollback / tests that pin the V1 endpoint. */
export const OPENFREEMAP_DARK_STYLE_URL =
  'https://tiles.openfreemap.org/styles/dark';

/** Fiord fallback URL (alias kept for V1.1 call sites). */
export const OPENFREEMAP_STYLE_URL = OPENFREEMAP_FIORD_STYLE_URL;

export const OPENFREEMAP_PLANET_URL = 'https://tiles.openfreemap.org/planet';

/** ArcGIS Online World Imagery XYZ tiles (same service as Cesium Esri stack). */
export const ESRI_WORLD_IMAGERY_TILE_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const ESRI_IMAGERY_ATTRIBUTION_TEXT =
  'Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

export const MAP_ATTRIBUTION_HTML_SATELLITE =
  `${ESRI_ATTRIBUTION_HTML} · ${ESRI_IMAGERY_ATTRIBUTION_TEXT} · ` +
  'Labels © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

export const MAP_ATTRIBUTION_HTML_FIORD =
  '© <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Fiord · ' +
  'Tiles <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · ' +
  'Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)';

/** Active attribution for the primary satellite-hybrid presentation. */
export const MAP_ATTRIBUTION_HTML = MAP_ATTRIBUTION_HTML_SATELLITE;

/**
 * Build the V1.2 satellite-hybrid MapLibre style (Esri raster + OFM labels/roads).
 * @returns {object}
 */
export function createSatelliteHybridStyle() {
  return {
    version: 8,
    name: 'caelrion-esri-satellite-hybrid',
    sources: {
      'esri-world-imagery': {
        type: 'raster',
        tiles: [ESRI_WORLD_IMAGERY_TILE_URL],
        tileSize: 256,
        maxzoom: 19,
        attribution: ESRI_IMAGERY_ATTRIBUTION_TEXT,
      },
      openmaptiles: {
        type: 'vector',
        url: OPENFREEMAP_PLANET_URL,
        attribution: '© OpenMapTiles · © OpenStreetMap contributors',
      },
    },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#1a1c18' },
      },
      {
        id: 'satellite',
        type: 'raster',
        source: 'esri-world-imagery',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      },
      {
        id: 'highway_minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 11,
        filter: [
          'all',
          ['!=', 'class', 'rail'],
          [
            'in',
            'class',
            'minor',
            'service',
            'path',
            'track',
            'tertiary',
            'secondary',
          ],
        ],
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.28)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 16, 2.2],
        },
      },
      {
        id: 'highway_major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 8,
        filter: [
          'all',
          ['!=', 'class', 'rail'],
          ['in', 'class', 'primary', 'trunk', 'motorway'],
        ],
        paint: {
          'line-color': 'rgba(255, 245, 220, 0.55)',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            0.8,
            14,
            2.8,
            17,
            5,
          ],
        },
      },
      {
        id: 'place_suburb',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 11,
        filter: ['==', 'class', 'suburb'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Open Sans Regular', 'Noto Sans Regular'],
          'text-size': 11,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.04,
        },
        paint: {
          'text-color': '#f4f1e8',
          'text-halo-color': 'rgba(20, 18, 12, 0.85)',
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'place_city',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['in', 'class', 'city', 'town'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Open Sans Bold', 'Noto Sans Bold'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            11,
            10,
            14,
            14,
            18,
          ],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.06,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(12, 12, 10, 0.9)',
          'text-halo-width': 1.6,
        },
      },
      {
        id: 'place_state',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        maxzoom: 8,
        filter: ['==', 'class', 'state'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Open Sans Semibold', 'Noto Sans Regular'],
          'text-size': 13,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1,
        },
        paint: {
          'text-color': 'rgba(255, 255, 255, 0.88)',
          'text-halo-color': 'rgba(12, 12, 10, 0.85)',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'place_country',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        maxzoom: 6,
        filter: ['==', 'class', 'country'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Open Sans Bold', 'Noto Sans Bold'],
          'text-size': 14,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(10, 10, 8, 0.9)',
          'text-halo-width': 1.7,
        },
      },
    ],
  };
}

/**
 * Fiord paint overrides retained for satellite-unavailable fallback.
 */
export const READABLE_DARK_PAINT_OVERRIDES = Object.freeze([
  { id: 'background', paint: { 'background-color': '#3a455c' } },
  { id: 'water', paint: { 'fill-color': '#2f3a52' } },
  { id: 'waterway', paint: { 'line-color': '#2f3a52' } },
  {
    id: 'landcover_wood',
    paint: { 'fill-color': 'hsla(150, 18%, 28%, 0.55)' },
  },
  {
    id: 'building',
    paint: {
      'fill-color': 'hsla(220, 28%, 22%, 0.72)',
      'fill-outline-color': 'hsla(220, 20%, 35%, 0.85)',
    },
  },
  { id: 'highway_path', paint: { 'line-color': '#5a6478' } },
  { id: 'highway_minor', paint: { 'line-color': '#6a7388' } },
  {
    id: 'highway_major_casing',
    paint: { 'line-color': 'rgba(120, 130, 150, 0.55)' },
  },
  { id: 'highway_major_inner', paint: { 'line-color': '#8b93a6' } },
  { id: 'highway_major_subtle', paint: { 'line-color': '#6e7689' } },
  {
    id: 'highway_motorway_casing',
    paint: { 'line-color': 'rgba(140, 155, 180, 0.65)' },
  },
  { id: 'highway_motorway_inner', paint: { 'line-color': '#a8b0c2' } },
  { id: 'highway_motorway_subtle', paint: { 'line-color': '#7a8498' } },
  {
    id: 'boundary_country_z0-4',
    paint: { 'line-color': 'hsl(210, 45%, 70%)' },
  },
  {
    id: 'boundary_country_z5-',
    paint: { 'line-color': 'hsl(210, 50%, 72%)' },
  },
  { id: 'boundary_state', paint: { 'line-color': 'hsl(210, 25%, 55%)' } },
  {
    id: 'highway_name_other',
    paint: {
      'text-color': 'hsl(210, 30%, 82%)',
      'text-halo-color': 'hsla(228, 40%, 16%, 0.85)',
      'text-halo-width': 1.4,
    },
  },
  {
    id: 'highway_name_motorway',
    paint: {
      'text-color': 'hsl(210, 25%, 88%)',
      'text-halo-color': 'hsla(228, 40%, 16%, 0.9)',
    },
  },
  {
    id: 'place_city',
    paint: {
      'text-color': 'hsl(195, 35%, 88%)',
      'text-halo-color': 'hsla(228, 50%, 14%, 0.85)',
      'text-halo-width': 1.5,
    },
  },
  {
    id: 'place_city_large',
    paint: {
      'text-color': 'hsl(195, 40%, 90%)',
      'text-halo-color': 'hsla(228, 50%, 14%, 0.9)',
      'text-halo-width': 1.6,
    },
  },
  {
    id: 'place_town',
    paint: {
      'text-color': 'hsl(200, 25%, 80%)',
      'text-halo-color': 'hsla(228, 45%, 16%, 0.8)',
    },
  },
  {
    id: 'place_state',
    paint: {
      'text-color': 'hsl(200, 20%, 78%)',
      'text-halo-color': 'hsla(228, 45%, 16%, 0.8)',
    },
  },
  {
    id: 'place_country_major',
    paint: {
      'text-color': 'hsl(200, 22%, 86%)',
      'text-halo-color': 'hsla(228, 50%, 12%, 0.9)',
    },
  },
  {
    id: 'water_name',
    paint: {
      'text-color': 'hsla(210, 40%, 78%, 0.9)',
      'text-halo-color': 'hsla(228, 40%, 18%, 0.75)',
    },
  },
]);

/**
 * Apply known layer paint overrides. Missing layers are skipped (style drift safe).
 */
export function applyReadableDarkPaint(
  map,
  overrides = READABLE_DARK_PAINT_OVERRIDES,
) {
  let applied = 0;
  for (const { id, paint } of overrides) {
    if (!map.getLayer(id)) continue;
    for (const [prop, value] of Object.entries(paint)) {
      try {
        map.setPaintProperty(id, prop, value);
        applied += 1;
      } catch {
        /* layer/paint drift — skip */
      }
    }
  }
  return applied;
}

/** Classify MapLibre error events for fail-soft tile vs fatal style / imagery. */
export function classifyMapError(event) {
  const raw = event?.error ?? event;
  const message = String(raw?.message || raw || '');
  const status = Number(raw?.status || raw?.statusCode || 0);
  const sourceId = String(event?.sourceId || raw?.url || '');
  const lower = message.toLowerCase();
  const isImagery =
    /esri-world-imagery|world_imagery|arcgisonline\.com/i.test(sourceId) ||
    /esri-world-imagery|world_imagery|arcgisonline\.com/i.test(lower);
  // Transient MapLibre transition noise — never treat as basemap death.
  if (
    /style is not done loading|style not ready|not fully loaded|cancel/i.test(
      lower,
    )
  ) {
    return { kind: 'unknown', message, isImagery };
  }
  const isTileOrGlyph =
    /tile|glyph|font|\.pbf|sprite|404|503|failed to fetch|networkerror|load failed/i.test(
      lower,
    ) ||
    /\/\d+\/\d+\/\d+/.test(sourceId) ||
    (status >= 400 && status < 600 && !/style/i.test(lower));
  const isStyleFatal =
    /stylesheet|style parse|failed to load style|unsupported|corrupt/i.test(
      lower,
    ) && !isTileOrGlyph;
  if (isStyleFatal) return { kind: 'style-fatal', message, isImagery };
  if (isTileOrGlyph) {
    return {
      kind: isImagery ? 'imagery-tile' : 'tile-or-glyph',
      message,
      isImagery,
    };
  }
  return { kind: 'unknown', message, isImagery };
}

/** Offline/fallback style when remote tiles are unavailable — slate, not pure black. */
export function createOfflineDarkStyleStub() {
  return {
    version: 8,
    name: 'caelrion-offline-slate-stub',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#3a455c' },
      },
    ],
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  };
}

export const MAP_LICENSE_MANIFEST = Object.freeze({
  style_design: {
    claim: 'Esri World Imagery + OpenMapTiles/OpenFreeMap label hybrid (V1.2)',
    license:
      'Esri Master Agreement for public World Imagery; OpenMapTiles / OSM ODbL for labels',
    url: 'https://www.esri.com/en-us/legal/terms/full-master-agreement',
    predecessor_v1_1:
      'OpenMapTiles Fiord via OpenFreeMap (retained as fallback)',
  },
  imagery: {
    provider: 'Esri',
    service:
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    attribution: ESRI_IMAGERY_ATTRIBUTION_TEXT,
    note: 'Same keyless ArcGIS Online endpoint already used by Cesium createEsriImagery()',
  },
  tiles: {
    provider: 'OpenFreeMap',
    url: 'https://openfreemap.org/',
    schema: 'OpenMapTiles',
    schema_url: 'https://openmaptiles.org/',
    style_url_fallback: OPENFREEMAP_FIORD_STYLE_URL,
  },
  data: {
    provider: 'OpenStreetMap contributors',
    license: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  fonts: {
    ui: 'Inter / Montserrat / Open Sans / Noto Sans / IBM Plex Mono (SIL OFL where applicable)',
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
    'Global CSS brightness filter as map substitute',
    'MapTiler Hybrid (requires API key — not configured on this host)',
    'ArcGIS Location Platform basemaps-api style (token required)',
  ],
});
