/**
 * Caelrion-owned NAIP aerial (photographic) basemap for MapLibre 2D (R16).
 *
 * User-facing label: "Satellite". Attribution must name USDA NAIP aerial imagery.
 * Large archive is a deploy artifact — not committed to git.
 */
import { layers } from '@protomaps/basemaps';
import { OWNED_PMTILES_PATH, createArgosDarkFlavor } from './ownedBasemap.js';

/** Initial Los Angeles photographic coverage (WGS84 W,S,E,N). */
export const AERIAL_COVERAGE_BOUNDS = Object.freeze({
  west: -118.42,
  south: 33.98,
  east: -118.08,
  north: 34.18,
});

/**
 * Immutable deploy artifact identity (bytes live outside git).
 * Digest filled after the R16 raster build; path pattern stays stable.
 */
export const OWNED_AERIAL_ARTIFACT = Object.freeze({
  id: 'caelrion-la-aerial-r01',
  filename: 'caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles',
  sha256: 'cc7ee43c04abd98fc6ffe11af50789beed23cc89963cca9701887e8184b83dff',
  bytes: 65411958,
  source: 'USDA National Agriculture Imagery Program (NAIP)',
  source_access: 'Microsoft Planetary Computer STAC (naip)',
  acquisition: '2022-05 (California 60 cm)',
  license: 'Public Domain — U.S. Government work / USDA FSA NAIP',
  tile_schema: 'RGB raster PMTiles (from MBTiles/JPEG)',
  zooms: '10-16',
  bbox: [-118.42, 33.98, -118.08, 34.18],
  native_projection: 'EPSG:3857',
  gsd_m: 2.4,
});

export const OWNED_AERIAL_PMTILES_PATH = `/assets/maps/${OWNED_AERIAL_ARTIFACT.filename}`;

export const MAP_ATTRIBUTION_HTML_AERIAL =
  'USDA <a href="https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip" target="_blank" rel="noopener">NAIP</a> aerial imagery · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> labels · ' +
  'Caelrion-hosted';

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
 * MapLibre style: owned NAIP raster + local vector label/road overlay.
 * Outside coverage the dark vector style remains the fallback (presenter).
 */
export function createOwnedAerialStyle({
  aerialUrl = OWNED_AERIAL_PMTILES_PATH,
  vectorUrl = OWNED_PMTILES_PATH,
} = {}) {
  const rasterUrl = aerialUrl.startsWith('pmtiles://')
    ? aerialUrl
    : `pmtiles://${aerialUrl}`;
  const sourceUrl = vectorUrl.startsWith('pmtiles://')
    ? vectorUrl
    : `pmtiles://${vectorUrl}`;
  const overlay = selectAerialOverlayLayers(
    layers('protomaps', createAerialOverlayFlavor(), { lang: 'en' }),
  );
  return {
    version: 8,
    name: 'caelrion-owned-naip-aerial',
    glyphs: '/assets/basemaps/fonts/{fontstack}/{range}.pbf',
    sprite: '/assets/basemaps/sprites/v4/dark',
    sources: {
      'caelrion-aerial': {
        type: 'raster',
        url: rasterUrl,
        tileSize: 256,
        attribution: 'USDA NAIP aerial imagery · Caelrion-hosted',
        maxzoom: 16,
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
        paint: { 'background-color': '#171D23' },
      },
      {
        id: 'caelrion-aerial-raster',
        type: 'raster',
        source: 'caelrion-aerial',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      },
      ...overlay,
    ],
  };
}

/** @param {number} lon @param {number} lat */
export function isInAerialCoverage(lon, lat) {
  const b = AERIAL_COVERAGE_BOUNDS;
  return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
}

/**
 * Aerial coverage state for the photographic archive.
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
  if (isInAerialCoverage(lon, lat)) return 'ready';
  return 'limited-coverage';
}

export const OWNED_AERIAL_LICENSE = Object.freeze({
  claim: 'Caelrion-hosted USDA NAIP aerial orthophotography (owned archive)',
  data_license: 'Public Domain (USDA FSA NAIP)',
  labels: 'ODbL (OpenStreetMap contributors) via Protomaps',
  tile_runtime: 'pmtiles',
  user_facing_name: 'Satellite',
  note: 'NAIP is aerial orthophotography, not orbital satellite imagery',
  not_used: [
    'Esri World Imagery',
    'MapTiler',
    'Argos proprietary imagery',
    'Scraped commercial satellite tiles',
  ],
  artifact: OWNED_AERIAL_ARTIFACT,
});

/** Persistable 2D basemap mode ids. */
export const BASEMAP_MODE_DARK = 'dark-vector';
export const BASEMAP_MODE_SATELLITE = 'owned-aerial';
export const BASEMAP_MODE_STORAGE_KEY = 'caelrion.view.basemapMode';
