/**
 * Caelrion-owned Protomaps/PMTiles 2D basemap (R15).
 *
 * Default MapLibre presentation is same-origin PMTiles + self-hosted glyphs/sprites.
 * Does not use Esri World Imagery or MapTiler. Large archive is a deploy artifact —
 * not committed to git.
 */
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';

/** Los Angeles default camera (MapLibre [lon, lat]). */
export const DEFAULT_MAP_CENTER = Object.freeze([-118.2437, 34.0522]);
export const DEFAULT_MAP_ZOOM = 10.5;

/** Southern California high-detail coverage (z8–z15). */
export const SOCAL_DETAIL_BOUNDS = Object.freeze({
  west: -121.5,
  south: 32.4,
  east: -114.0,
  north: 35.9,
});

/** Zooms above this outside SoCal report limited-coverage (not offline). */
export const OWNED_GLOBAL_MAX_ZOOM = 7;

/**
 * Immutable deploy artifact identity (bytes live outside git).
 * File: /assets/maps/<filename> on the static host.
 */
export const OWNED_BASEMAP_ARTIFACT = Object.freeze({
  id: 'caelrion-basemap-r01',
  filename: 'caelrion-basemap-r01-822f068466c7.pmtiles',
  sha256: '822f068466c79112046e1ccbc4e93c306110d208a535d746a19bc84aed729d55',
  bytes: 790349026,
  source_build: 'https://build.protomaps.com/20261118.pmtiles',
  source_etag: 'f80d23ebf8f97045b56ad0bc73b8ec76-521',
  source_osm_time: '2026-11-18T04:00:00Z',
  tile_schema: 'Protomaps basemap v4 / MVT',
  version_label: '4.15.2',
  zooms: {
    global: '0-7',
    socal_detail: '8-15',
  },
  socal_bbox: [-121.5, 32.4, -114.0, 35.9],
});

export const OWNED_PMTILES_PATH = `/assets/maps/${OWNED_BASEMAP_ARTIFACT.filename}`;

export const MAP_ATTRIBUTION_HTML_OWNED =
  '© <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL) · ' +
  'Caelrion-hosted vector basemap';

/** Argos charcoal/olive-tuned Protomaps dark flavor. */
export function createArgosDarkFlavor() {
  const base = namedFlavor('dark');
  return {
    ...base,
    background: '#1F201C',
    earth: '#2E2C22',
    park_a: '#2a3224',
    park_b: '#26301f',
    wood_a: '#2a3024',
    wood_b: '#283022',
    scrub_a: '#2e2c22',
    scrub_b: '#2c2a20',
    water: '#1a3344',
    buildings: '#3a382e',
    highway: '#6a6558',
    major: '#5a564a',
    minor_a: '#4a463c',
    minor_b: '#454138',
    link: '#5a564a',
    other: '#4a463c',
    city_label: '#E8BC3B',
    city_label_halo: '#1F201C',
    subplace_label: '#c8c2b0',
    subplace_label_halo: '#1F201C',
    state_label: '#9a9484',
    country_label: '#d0c8b4',
    ocean_label: '#80A2D6',
    roads_label_major: '#c8c2b0',
    roads_label_minor: '#8a8478',
    boundaries: '#5a6470',
    pois: {
      ...base.pois,
      turquoise: '#11ACA9',
      pink: '#D67680',
      blue: '#80A2D6',
      tangerine: '#E8BC3B',
      slategray: '#8A6AFF',
    },
  };
}

/**
 * MapLibre style for the owned PMTiles archive (same-origin assets only).
 * @param {{ tilesUrl?: string }} [opts]
 */
export function createOwnedBasemapStyle({
  tilesUrl = OWNED_PMTILES_PATH,
} = {}) {
  const sourceUrl = tilesUrl.startsWith('pmtiles://')
    ? tilesUrl
    : `pmtiles://${tilesUrl}`;
  return {
    version: 8,
    name: 'caelrion-owned-protomaps-dark',
    glyphs: '/assets/basemaps/fonts/{fontstack}/{range}.pbf',
    sprite: '/assets/basemaps/sprites/v4/dark',
    sources: {
      protomaps: {
        type: 'vector',
        url: sourceUrl,
        attribution:
          '© Protomaps · © OpenStreetMap contributors · Caelrion-hosted',
        maxzoom: 15,
      },
    },
    layers: layers('protomaps', createArgosDarkFlavor(), { lang: 'en' }),
  };
}

let _protocolRegistered = false;

/** Register the MapLibre `pmtiles://` protocol once per page. */
export function ensurePmtilesProtocol() {
  if (_protocolRegistered) return true;
  const protocol = new Protocol({ metadata: true });
  maplibregl.addProtocol('pmtiles', protocol.tile);
  _protocolRegistered = true;
  return true;
}

export function isPmtilesProtocolRegistered() {
  return _protocolRegistered;
}

/** @param {number} lon @param {number} lat */
export function isInSocalDetailBounds(lon, lat) {
  const b = SOCAL_DETAIL_BOUNDS;
  return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
}

/**
 * Coverage state for the owned archive (not a provider outage).
 * @returns {'ready'|'limited-coverage'}
 */
export function ownedCoverageState({ lon, lat, zoom }) {
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(zoom)
  ) {
    return 'ready';
  }
  if (zoom <= OWNED_GLOBAL_MAX_ZOOM) return 'ready';
  if (isInSocalDetailBounds(lon, lat)) return 'ready';
  return 'limited-coverage';
}

export const OWNED_BASEMAP_LICENSE = Object.freeze({
  claim: 'Caelrion-hosted Protomaps v4 vector basemap (owned archive)',
  data_license: 'ODbL (OpenStreetMap contributors)',
  style_package: '@protomaps/basemaps',
  tile_runtime: 'pmtiles',
  glyphs_sprites: 'Self-hosted from protomaps/basemaps-assets (SIL OFL fonts)',
  not_used: [
    'Esri World Imagery (default 2D retired)',
    'MapTiler Hybrid',
    'ArcGIS Location Platform basemaps-api',
    'Keyless services.arcgisonline.com as default 2D',
    'Argos proprietary tiles',
  ],
  artifact: OWNED_BASEMAP_ARTIFACT,
});
