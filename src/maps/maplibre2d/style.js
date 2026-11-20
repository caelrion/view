/**
 * Licensed dark vector style endpoints for the Argos-matched 2D map.
 *
 * V1 used OpenFreeMap `dark` (near-black CARTO Dark Matter family) which
 * under-contrasted land/water vs the Argos reference. V1.1 switches to the
 * OpenFreeMap-hosted OpenMapTiles **Fiord** style (blue-grey / slate midtones)
 * with bounded paint overrides for roads and labels — same OpenMapTiles
 * schema / OSM ODbL data plane. Not Argos proprietary assets.
 *
 * Terms must be re-verified if providers change; missing rights => HOLD and
 * fall back to the offline style stub below.
 */

/** V1.1 primary — OpenMapTiles Fiord via OpenFreeMap (readable dark slate). */
export const OPENFREEMAP_FIORD_STYLE_URL =
  'https://tiles.openfreemap.org/styles/fiord';

/** Retained for rollback / tests that pin the V1 endpoint. */
export const OPENFREEMAP_DARK_STYLE_URL =
  'https://tiles.openfreemap.org/styles/dark';

/** Active production style for the Argos 2D presenter. */
export const OPENFREEMAP_STYLE_URL = OPENFREEMAP_FIORD_STYLE_URL;

export const MAP_ATTRIBUTION_HTML =
  '© <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Fiord · ' +
  'Tiles <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · ' +
  'Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)';

/**
 * Bounded paint overrides applied after Fiord style load.
 * Improves road hierarchy and label halos without inventing geography.
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
 * @param {{ getLayer: (id: string) => unknown, setPaintProperty: (id: string, name: string, value: unknown) => void }} map
 * @param {typeof READABLE_DARK_PAINT_OVERRIDES} [overrides]
 * @returns {number} count of paint properties applied
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
  const isTileOrGlyph =
    /tile|glyph|font|\.pbf|sprite|404|503|failed to fetch|networkerror|load failed/i.test(
      lower,
    ) ||
    /\/\d+\/\d+\/\d+/.test(sourceId) ||
    (status >= 400 && status < 600 && !/style/i.test(lower));
  const isStyleFatal =
    /style|stylesheet|parse|json|unsupported|corrupt/i.test(lower) &&
    !isTileOrGlyph;
  if (isStyleFatal) return { kind: 'style-fatal', message };
  if (isTileOrGlyph) return { kind: 'tile-or-glyph', message };
  return { kind: 'unknown', message };
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
    claim: 'OpenMapTiles Fiord visual family (V1.1)',
    license:
      'OpenMapTiles / OpenFreeMap provider terms; CC-compatible design heritage',
    url: 'https://openmaptiles.org/',
    predecessor_v1:
      'CARTO Dark Matter via OpenFreeMap dark (retained as OPENFREEMAP_DARK_STYLE_URL)',
  },
  tiles: {
    provider: 'OpenFreeMap',
    url: 'https://openfreemap.org/',
    schema: 'OpenMapTiles',
    schema_url: 'https://openmaptiles.org/',
    style_url: OPENFREEMAP_STYLE_URL,
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
  ],
});
