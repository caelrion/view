/**
 * MapLibre styles for the Argos-matched 2D map.
 *
 * R15 primary: Caelrion-hosted Protomaps/PMTiles vector basemap (owned archive).
 * Fiord remains an optional recovery path when the owned archive cannot load.
 * Offline slate stub is last resort. Esri satellite hybrid is retained only as
 * a non-default legacy builder — never the default 2D presentation.
 */

export { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './ownedBasemap.js';

export {
  createOwnedBasemapStyle,
  ensurePmtilesProtocol,
  ownedCoverageState,
  MAP_ATTRIBUTION_HTML_OWNED,
  OWNED_BASEMAP_ARTIFACT,
  OWNED_PMTILES_PATH,
  OWNED_BASEMAP_LICENSE,
  SOCAL_DETAIL_BOUNDS,
  OWNED_GLOBAL_MAX_ZOOM,
  createArgosDarkFlavor,
} from './ownedBasemap.js';

export {
  createOwnedAerialStyle,
  createStreamedSatelliteStyle,
  aerialCoverageState,
  isInAerialCoverage,
  MAP_ATTRIBUTION_HTML_AERIAL,
  OWNED_AERIAL_ARTIFACT,
  OWNED_AERIAL_PMTILES_PATH,
  OWNED_AERIAL_LICENSE,
  AERIAL_COVERAGE_BOUNDS,
  BASEMAP_MODE_DARK,
  BASEMAP_MODE_SATELLITE,
  BASEMAP_MODE_STORAGE_KEY,
  selectAerialOverlayLayers,
  createAerialOverlayFlavor,
  EOX_CLOUDLESS_2016_TILE_URL,
  GIBS_BLUE_MARBLE_TILE_URL,
  EOX_MIN_ZOOM,
  EOX_MAX_ZOOM,
} from './ownedAerial.js';

import { ESRI_ATTRIBUTION_HTML } from '../imagery.js';
import {
  MAP_ATTRIBUTION_HTML_OWNED,
  OWNED_BASEMAP_LICENSE,
} from './ownedBasemap.js';
import { OWNED_AERIAL_LICENSE } from './ownedAerial.js';

/** OpenFreeMap Fiord — optional recovery when owned archive fails. */
export const OPENFREEMAP_FIORD_STYLE_URL =
  'https://tiles.openfreemap.org/styles/fiord';

/** Retained for rollback / tests that pin the V1 endpoint. */
export const OPENFREEMAP_DARK_STYLE_URL =
  'https://tiles.openfreemap.org/styles/dark';

/** Fiord fallback URL (alias kept for V1.1 call sites). */
export const OPENFREEMAP_STYLE_URL = OPENFREEMAP_FIORD_STYLE_URL;

export const OPENFREEMAP_PLANET_URL = 'https://tiles.openfreemap.org/planet';

/** Legacy Esri XYZ — not used as default 2D after R15. */
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

/** Active attribution for the primary owned-vector presentation. */
export const MAP_ATTRIBUTION_HTML = MAP_ATTRIBUTION_HTML_OWNED;

/**
 * @deprecated R15 — not the default 2D style. Kept for hostile/legacy tests only.
 * @returns {object}
 */
export function createSatelliteHybridStyle() {
  return {
    version: 8,
    name: 'caelrion-esri-satellite-hybrid-legacy',
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
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 },
      },
    ],
  };
}

/**
 * Fiord paint overrides retained for optional Fiord recovery.
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
    id: 'place_city',
    paint: {
      'text-color': 'hsl(195, 35%, 88%)',
      'text-halo-color': 'hsla(228, 50%, 14%, 0.85)',
      'text-halo-width': 1.5,
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

/** Classify MapLibre error events for fail-soft tile vs fatal style. */
export function classifyMapError(event) {
  const raw = event?.error ?? event;
  const message = String(raw?.message || raw || '');
  const status = Number(raw?.status || raw?.statusCode || 0);
  const sourceId = String(event?.sourceId || raw?.url || '');
  const lower = message.toLowerCase();
  const isImagery =
    /esri-world-imagery|world_imagery|arcgisonline\.com/i.test(sourceId) ||
    /esri-world-imagery|world_imagery|arcgisonline\.com/i.test(lower);
  const isOwned =
    /protomaps|pmtiles|caelrion-basemap/i.test(sourceId) ||
    /protomaps|pmtiles|caelrion-basemap/i.test(lower);
  if (
    /style is not done loading|style not ready|not fully loaded|cancel/i.test(
      lower,
    )
  ) {
    return { kind: 'unknown', message, isImagery, isOwned };
  }
  const isTileOrGlyph =
    /tile|glyph|font|\.pbf|sprite|404|503|failed to fetch|networkerror|load failed|missing/i.test(
      lower,
    ) ||
    /\/\d+\/\d+\/\d+/.test(sourceId) ||
    (status >= 400 && status < 600 && !/style/i.test(lower));
  const isStyleFatal =
    /stylesheet|style parse|failed to load style|unsupported|corrupt/i.test(
      lower,
    ) && !isTileOrGlyph;
  if (isStyleFatal) return { kind: 'style-fatal', message, isImagery, isOwned };
  if (isTileOrGlyph) {
    return {
      kind: isImagery ? 'imagery-tile' : 'tile-or-glyph',
      message,
      isImagery,
      isOwned,
    };
  }
  return { kind: 'unknown', message, isImagery, isOwned };
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
        paint: { 'background-color': '#171D23' },
      },
    ],
    glyphs: '/assets/basemaps/fonts/{fontstack}/{range}.pbf',
  };
}

export const MAP_LICENSE_MANIFEST = Object.freeze({
  style_design: {
    claim: OWNED_BASEMAP_LICENSE.claim,
    license: OWNED_BASEMAP_LICENSE.data_license,
    url: 'https://www.openstreetmap.org/copyright',
    predecessor_v1_2_satellite:
      'Esri World Imagery hybrid (retired as default 2D)',
    predecessor_v1_1: 'OpenMapTiles Fiord via OpenFreeMap (optional recovery)',
  },
  owned_basemap: OWNED_BASEMAP_LICENSE.artifact,
  owned_aerial: OWNED_AERIAL_LICENSE.artifact,
  tiles: {
    provider: 'Caelrion-hosted Protomaps extract',
    runtime: 'pmtiles',
    path_pattern: '/assets/maps/caelrion-basemap-r01-*.pmtiles',
  },
  aerial_tiles: {
    provider: 'EOxCloudless 2016 (streamed) + NASA GIBS Blue Marble',
    runtime: 'HTTPS WMTS/XYZ on demand',
    eox_layer: 's2cloudless_3857',
    license: 'CC BY 4.0 (2016 vintage only)',
    user_facing_name: 'Satellite',
    not_self_hosted: true,
  },
  data: {
    provider: 'OpenStreetMap contributors',
    license: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  fonts: {
    ui: 'Inter / Montserrat / Open Sans / Noto Sans / IBM Plex Mono',
    map_glyphs: 'Self-hosted Noto Sans stacks (SIL OFL)',
  },
  maplibre: {
    package: 'maplibre-gl',
    license: 'BSD-3-Clause',
  },
  not_used: [
    ...OWNED_BASEMAP_LICENSE.not_used,
    ...OWNED_AERIAL_LICENSE.not_used,
  ],
});
