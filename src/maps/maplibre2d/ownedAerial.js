/**
 * R17 streamed worldwide photographic basemap (MapLibre 2D "Satellite").
 *
 * Primary: EOxCloudless 2016 (CC BY 4.0) — on-demand WMTS, no local planet cache.
 * Low zoom: NASA GIBS Blue Marble Next Generation.
 * Labels/roads: owned Protomaps PMTiles overlays (SoCal detail + global overview).
 * Outside SoCal high-detail, overlays overzoom owned z0–7; dark mode uses OpenFreeMap
 * for street detail (see presenter coverage path).
 *
 * Does not download, mosaic, or host a worldwide imagery archive on the droplet.
 */
import { layers } from '@protomaps/basemaps';
import {
  OWNED_PMTILES_PATH,
  createArgosDarkFlavor,
} from './ownedBasemap.js';

/** EOxCloudless 2016 — Web Mercator WMTS (TileMatrix/TileRow/TileCol = z/y/x). */
export const EOX_CLOUDLESS_2016_TILE_URL =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';

/** NASA GIBS Blue Marble — global true-color overview (low zoom). */
export const GIBS_BLUE_MARBLE_TILE_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';

export const EOX_MIN_ZOOM = 5;
export const EOX_MAX_ZOOM = 14;
export const GIBS_MAX_ZOOM = 8;

/**
 * R16 LA NAIP archive is retained on disk for rollback/custody only.
 * R17 Satellite mode does not use it as the default photographic source.
 */
export const OWNED_AERIAL_ARTIFACT = Object.freeze({
  id: 'caelrion-la-aerial-r01',
  filename: 'caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles',
  sha256:
    'cc7ee43c04abd98fc6ffe11af50789beed23cc89963cca9701887e8184b83dff',
  bytes: 65411958,
  status: 'superseded-as-default-by-r17-streamed-eox',
  note: 'Retained deploy artifact; not the R17 Satellite primary source',
});

export const OWNED_AERIAL_PMTILES_PATH = `/assets/maps/${OWNED_AERIAL_ARTIFACT.filename}`;

/** @deprecated R17 — worldwide imagery has no local footprint gate. */
export const AERIAL_COVERAGE_BOUNDS = Object.freeze({
  west: -180,
  south: -85,
  east: 180,
  north: 85,
});

export const MAP_ATTRIBUTION_HTML_AERIAL =
  '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by ' +
  '<a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> ' +
  '(Contains modified Copernicus Sentinel data 2016 &amp; 2017) · ' +
  '<a href="https://earthobservatory.nasa.gov/features/BlueMarble" target="_blank" rel="noopener">NASA Blue Marble</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> labels';

/** Light overlay flavor for roads/labels on photographic imagery. */
export function createAerialOverlayFlavor() {
  const base = createArgosDarkFlavor();
  const halo = 'rgba(23, 32, 39, 0.85)';
  return {
    ...base,
    background: '#171D23',
    earth: '#20272D',
    water: '#102D40',
    buildings: 'rgba(48, 58, 64, 0.15)',
    highway: '#F2F5F7',
    major: '#E5EBEF',
    minor_a: '#C8D2D8',
    minor_b: '#C8D2D8',
    link: '#E5EBEF',
    other: '#C8D2D8',
    city_label: '#F7FAFC',
    city_label_halo: halo,
    subplace_label: '#E5EBEF',
    subplace_label_halo: halo,
    state_label: '#B8C6CE',
    state_label_halo: halo,
    country_label: '#F7FAFC',
    roads_label_major: '#F7FAFC',
    roads_label_major_halo: halo,
    roads_label_minor: '#D5DEE4',
    roads_label_minor_halo: halo,
    address_label: '#D5DEE4',
    address_label_halo: halo,
    boundaries: 'rgba(232, 236, 240, 0.55)',
  };
}

const AERIAL_OVERLAY_KEEP =
  /^(roads_|boundaries|places_|address_label|water_waterway_label|water_label_|earth_label_|pois|roads_shields|roads_oneway)/;

const AERIAL_OVERLAY_DROP =
  /^(background|earth$|landcover|landuse_|water$|buildings|roads_runway|roads_taxiway)/;

/**
 * Filter Protomaps layers to road/label/boundary overlays suitable over imagery.
 * @param {object[]} allLayers
 */
export function selectAerialOverlayLayers(allLayers) {
  return allLayers.filter((layer) => {
    const id = String(layer.id || '');
    if (AERIAL_OVERLAY_DROP.test(id)) return false;
    return AERIAL_OVERLAY_KEEP.test(id);
  });
}

/**
 * MapLibre style: streamed EOx/GIBS imagery + owned vector overlays.
 * Imagery tiles are requested only for the visible viewport (MapLibre default).
 */
export function createOwnedAerialStyle({
  vectorUrl = OWNED_PMTILES_PATH,
} = {}) {
  const sourceUrl = vectorUrl.startsWith('pmtiles://')
    ? vectorUrl
    : `pmtiles://${vectorUrl}`;
  const overlay = selectAerialOverlayLayers(
    layers('protomaps', createAerialOverlayFlavor(), { lang: 'en' }),
  );
  return {
    version: 8,
    name: 'caelrion-streamed-eox-satellite',
    glyphs: '/assets/basemaps/fonts/{fontstack}/{range}.pbf',
    sprite: '/assets/basemaps/sprites/v4/dark',
    sources: {
      'gibs-blue-marble': {
        type: 'raster',
        tiles: [GIBS_BLUE_MARBLE_TILE_URL],
        tileSize: 256,
        maxzoom: GIBS_MAX_ZOOM,
        attribution:
          'NASA Blue Marble Next Generation (GIBS)',
      },
      'eox-cloudless-2016': {
        type: 'raster',
        tiles: [EOX_CLOUDLESS_2016_TILE_URL],
        tileSize: 256,
        minzoom: EOX_MIN_ZOOM,
        maxzoom: EOX_MAX_ZOOM,
        attribution:
          'Sentinel-2 cloudless by EOX IT Services GmbH (CC BY 4.0)',
      },
      protomaps: {
        type: 'vector',
        url: sourceUrl,
        attribution:
          '© Protomaps · © OpenStreetMap contributors · Caelrion-hosted',
        maxzoom: 15,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0b1220' },
      },
      {
        id: 'gibs-blue-marble-raster',
        type: 'raster',
        source: 'gibs-blue-marble',
        maxzoom: EOX_MIN_ZOOM + 0.5,
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      },
      {
        id: 'eox-cloudless-raster',
        type: 'raster',
        source: 'eox-cloudless-2016',
        minzoom: EOX_MIN_ZOOM,
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      },
      ...overlay,
    ],
  };
}

/** Alias retained for call sites. */
export const createStreamedSatelliteStyle = createOwnedAerialStyle;

/** @param {number} lon @param {number} lat */
export function isInAerialCoverage(lon, lat) {
  return Number.isFinite(lon) && Number.isFinite(lat);
}

/**
 * Streamed worldwide imagery — ready whenever camera is valid.
 * High-zoom beyond EOx max reports limited-coverage (not offline).
 * @returns {'ready'|'limited-coverage'}
 */
export function aerialCoverageState({ lon, lat, zoom }) {
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(zoom)
  ) {
    return 'ready';
  }
  if (zoom > EOX_MAX_ZOOM + 1.5) return 'limited-coverage';
  return 'ready';
}

export const OWNED_AERIAL_LICENSE = Object.freeze({
  claim:
    'Streamed EOxCloudless 2016 (CC BY 4.0) + NASA GIBS Blue Marble overview',
  data_license: 'CC BY 4.0 (EOX 2016); NASA imagery credit required',
  labels: 'ODbL (OpenStreetMap contributors) via Protomaps / OpenFreeMap',
  tile_runtime: 'HTTPS WMTS/XYZ on demand — not self-hosted planet imagery',
  user_facing_name: 'Satellite',
  note: '2018–2025 EOx noncommercial layers are not used',
  not_used: [
    'Esri World Imagery (keyless)',
    'MapTiler',
    'EOxCloudless 2018–2025 noncommercial public tiles',
    'Argos proprietary imagery',
    'Full-planet local PMTiles / MBTiles mosaic',
  ],
  eox_tile_url: EOX_CLOUDLESS_2016_TILE_URL,
  gibs_tile_url: GIBS_BLUE_MARBLE_TILE_URL,
  legacy_naip_artifact: OWNED_AERIAL_ARTIFACT,
});

/** Persistable 2D basemap mode ids. */
export const BASEMAP_MODE_DARK = 'dark-vector';
export const BASEMAP_MODE_SATELLITE = 'owned-aerial';
export const BASEMAP_MODE_STORAGE_KEY = 'caelrion.view.basemapMode';
